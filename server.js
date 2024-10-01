const express = require('express');
const path = require('path');
const pg = require('pg');
const cors = require('cors');
require('dotenv').config(); 


const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const client = new pg.Client(config);

client.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
    }
    console.log('Connected to the database');
   // queryDatabase();
});
function errorHandler(err, req, res, next) {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Ocorreu um erro devido a instabilidade no servidor tente novamente mais tarde, isso pode ser rápido de 5 à 20 minutos devido a grande demanda do servidor, obrigado por compreender.' });
}


  
// Rota principal - Obtém dados de barbeiros, transações e relatório geral
app.get('/', async (req, res, next) => {
    try {
        const queryBarbeiros = `
            SELECT
                b.id AS id, 
                b.nome AS nome,
                COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor * 0.37 END), 0) AS total_entrada_servicos,
                COALESCE(SUM(CASE WHEN t.tipo = 'produto' AND t.fechado = FALSE THEN t.valor * 0.10 END), 0) AS comissao_produtos,
                COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor * 0.37 END) + SUM(CASE WHEN t.tipo = 'produto' AND t.fechado = FALSE THEN t.valor * 0.10 END), 0) AS total_rendimento,
                COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND t.fechado = FALSE THEN t.valor END), 0) AS total_saida,
                COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor * 0.37 END) - SUM(CASE WHEN t.tipo = 'saida' AND t.fechado = FALSE THEN t.valor END), 0) AS saldo,
                COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND DATE(t.data) = CURRENT_DATE AND t.fechado = FALSE THEN t.valor * 0.37 END), 0) AS total_entrada_dia,
                COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND DATE(t.data) = CURRENT_DATE AND t.fechado = FALSE THEN t.valor END), 0) AS total_saida_dia,
                COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND EXTRACT(WEEK FROM t.data) = EXTRACT(WEEK FROM CURRENT_DATE) AND t.fechado = FALSE THEN t.valor * 0.37 END), 0) AS total_entrada_semana,
                COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND EXTRACT(WEEK FROM t.data) = EXTRACT(WEEK FROM CURRENT_DATE) AND t.fechado = FALSE THEN t.valor END), 0) AS total_saida_semana,
                COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND EXTRACT(MONTH FROM t.data) = EXTRACT(MONTH FROM CURRENT_DATE) AND t.fechado = FALSE THEN t.valor * 0.37 END), 0) AS total_entrada_mes,
                COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND EXTRACT(MONTH FROM t.data) = EXTRACT(MONTH FROM CURRENT_DATE) AND t.fechado = FALSE THEN t.valor END), 0) AS total_saida_mes,
                COUNT(DISTINCT t.id) AS total_servicos,
                COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'produto' AND t.fechado = FALSE THEN 1 END), 0) AS produtos
            FROM
                barbeiros b
            LEFT JOIN
                transacao t ON t.barbeiro_id = b.id
            GROUP BY
                b.id, b.nome
        `;

        const resultBarbeiros = await client.query(queryBarbeiros);
        const formatDate = (date) => {
            const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
            return new Date(date).toLocaleDateString('pt-BR', options);
        };
        const queryTransacoes = `
            SELECT
                t.id,
                t.tipo,
                t.forma_pagamento,
                t.valor,
                t.servico,                
                t.nome_do_item,
                t.data,
                t.barbeiro_id,                
                b.nome AS barbeiro,
                t.fechado
            FROM
                transacao t
            JOIN
                barbeiros b ON t.barbeiro_id = b.id
            WHERE
                DATE(t.data) = CURRENT_DATE
        `;

        const transacoes = await client.query(queryTransacoes);

        const queryRelatorio = `
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor END), 0) AS total_entrada,
                COALESCE(SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor END), 0) AS total_saida,
                COALESCE(SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor END) - SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor END), 0) AS saldo_total,
                COALESCE(SUM(CASE WHEN tipo = 'entrada' AND DATE(data) = CURRENT_DATE AND fechado = FALSE THEN valor END), 0) AS total_entrada_dia,
                COALESCE(SUM(CASE WHEN tipo = 'saida' AND DATE(data) = CURRENT_DATE AND fechado = FALSE THEN valor END), 0) AS total_saida_dia,
                COALESCE(SUM(CASE WHEN tipo = 'entrada' AND EXTRACT(WEEK FROM data) = EXTRACT(WEEK FROM CURRENT_DATE) AND fechado = FALSE THEN valor END), 0) AS total_entrada_semana,
                COALESCE(SUM(CASE WHEN tipo = 'saida' AND EXTRACT(WEEK FROM data) = EXTRACT(WEEK FROM CURRENT_DATE) AND fechado = FALSE THEN valor END), 0) AS total_saida_semana,
                COALESCE(SUM(CASE WHEN tipo = 'entrada' AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE) AND fechado = FALSE THEN valor END), 0) AS total_entrada_mes,
                COALESCE(SUM(CASE WHEN tipo = 'saida' AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE) AND fechado = FALSE THEN valor END), 0) AS total_saida_mes,
                COALESCE(SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor END) - SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor END), 0) AS saldo_total
            FROM
                transacao
        `;

        const resultRelatorio = await client.query(queryRelatorio);
        transacoes.rows = transacoes.rows.map(transacao => ({
            ...transacao,
            data: formatDate(transacao.data) 
        }));
        res.render('app', {
            barbeiros: resultBarbeiros.rows,
            transacoes: transacoes.rows,
            relatorio: resultRelatorio.rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// Rota para adicionar uma nova transação
app.post('/transacao', async (req, res, next) => {
    try {
        let { tipo, valor, servico, forma_pagamento, barbeiro_id, nome_do_item } = req.body;
if (servico === 'vale') {
            tipo = 'saida';
        }
        if (!tipo || !valor || !servico || !forma_pagamento || !barbeiro_id) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        const validFormaPagamento = ['Pix', 'Cartao', 'Dinheiro'];
        if (!validFormaPagamento.includes(forma_pagamento)) {
            return res.status(400).json({ error: 'Forma de pagamento inválida.' });
        }

        const query = `
            INSERT INTO transacao (tipo, valor, servico, forma_pagamento, barbeiro_id, nome_do_item, data)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
        `;

        await client.query(query, [tipo, valor, servico, forma_pagamento, barbeiro_id, nome_do_item || null]);
        res.redirect('/');
    } catch (err) {
        next(err);
    }
});


// Rota para editar uma transação existente
app.post('/update-transacao', async (req, res, next) => {
    try {
        const { id, tipo, valor, data, forma_pagamento, nome_do_item, barbeiro_id } = req.body;

        // Supondo que 'data' seja uma string no formato 'dd/mm/yyyy'
      //  const [day, month, year] = data.split('/').map(Number);
      //  const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        const query = `
            UPDATE transacao
            SET tipo = $1, valor = $2, data = $3, forma_pagamento = $4, nome_do_item = $5, barbeiro_id = $6
            WHERE id = $7
        `;

        await client.query(query, [tipo, valor, data, forma_pagamento, nome_do_item || null, barbeiro_id, id]);
        res.redirect('/');
    } catch (err) {
        next(err);
        console.error("erorr de atulaização ", err);
    }
});


// Rota para fechar uma transação
app.post('/fechar-caixa', (req, res, next) => {
    const query = 'UPDATE transacao SET fechado = TRUE WHERE fechado = FALSE';

    client.query(query, (err, result) => {
        if (err) return next(err);
        res.redirect('/'); 
    });
});

app.get('/barbeiro-servicos/:id', (req, res, next) => {
    const { id } = req.params;

    const query = `
        SELECT 
    COUNT(*) AS total_servicos,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'corte' AND fechado = FALSE THEN 1 ELSE 0 END) AS cortes,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'barba' AND fechado = FALSE THEN 1 ELSE 0 END) AS barbas,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'sobrancelha' AND fechado = FALSE THEN 1 ELSE 0 END) AS sobrancelha,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'hidratacao' AND fechado = FALSE THEN 1 ELSE 0 END) AS hidratacao,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'selagem' AND fechado = FALSE THEN 1 ELSE 0 END) AS selagem,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'infantil' AND fechado = FALSE THEN 1 ELSE 0 END) AS infantil,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'tesousa' AND fechado = FALSE THEN 1 ELSE 0 END) AS tesousa,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'combo' AND fechado = FALSE THEN 1 ELSE 0 END) AS combo,
    SUM(CASE WHEN tipo = 'saida' AND servico = 'vale' AND fechado = FALSE THEN 1 ELSE 0 END) AS vale,
    SUM(CASE WHEN tipo = 'entrada' AND servico = 'produto' AND fechado = FALSE THEN 1 ELSE 0 END) AS produtos,
    SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor ELSE 0 END) AS saidas
    FROM
    transacao
WHERE
    barbeiro_id = $1 AND fechado = FALSE;

    `;

    client.query(query, [id], (err, result) => {
        if (err) return next(err);
        res.json(result.rows[0]);
    });
});


// Rota para obter dados de um barbeiro específico
app.get('/barbeiro-relatorio/:id', (req, res, next) => {
    const { id } = req.params;

    const query = `
        SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND servico != 'produto' AND servico != 'vale' AND fechado = FALSE THEN valor * 0.37 END), 0) AS rendimento_servicos,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND servico = 'produto' AND fechado = FALSE THEN valor * 0.10 END), 0) AS comissao_produtos,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND servico != 'produto' AND servico != 'vale' AND fechado = FALSE THEN valor * 0.37 END) +
             SUM(CASE WHEN tipo = 'entrada' AND servico = 'produto' AND fechado = FALSE THEN valor * 0.10 END), 0) - 
             COALESCE(SUM(CASE WHEN tipo = 'saida' AND servico = 'vale' AND fechado = FALSE THEN valor END), 0) AS total_rendimento,
    COALESCE(SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor END), 0) AS total_saida,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND servico != 'vale' AND fechado = FALSE THEN valor * 0.37 END) - 
             SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor END), 0) AS saldo
FROM
    transacao
WHERE
    barbeiro_id = $1;

    `;

    client.query(query, [id], (err, result) => {
        if (err) return next(err);
        res.json(result.rows[0]);
    });
});

app.get('/relatorio-mensal', (req, res) => {
    const { mes, ano } = req.query;

    const queryTransacoes = `
        SELECT
            SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS total_entrada_mes,
            SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) AS total_saida_mes,
            (SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END)) AS saldo_mes
        FROM transacao
        WHERE EXTRACT(MONTH FROM data) = $1 AND EXTRACT(YEAR FROM data) = $2;
    `;

    const queryServicos = `
       SELECT 
    b.nome AS nome_barbeiro,  -- Pega o nome do barbeiro da tabela barbeiros
    t.barbeiro_id,
    COUNT(*) AS total_servicos,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'corte' THEN 1 ELSE 0 END) AS cortes,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'barba' THEN 1 ELSE 0 END) AS barbas,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'sobrancelha' THEN 1 ELSE 0 END) AS sobrancelha,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'hidratacao' THEN 1 ELSE 0 END) AS hidratacao,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'selagem' THEN 1 ELSE 0 END) AS selagem,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'infantil' THEN 1 ELSE 0 END) AS infantil,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'tesousa' THEN 1 ELSE 0 END) AS tesousa,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'combo' THEN 1 ELSE 0 END) AS combo,
    SUM(CASE WHEN t.tipo = 'saida' AND t.servico = 'vale' THEN 1 ELSE 0 END) AS vale,
    SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'produto' THEN 1 ELSE 0 END) AS produtos,
    SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END) AS saidas
FROM transacao t
JOIN barbeiros b ON t.barbeiro_id = b.id  -- Realiza o JOIN entre as duas tabelas
WHERE EXTRACT(MONTH FROM t.data) = $1 
  AND EXTRACT(YEAR FROM t.data) = $2
GROUP BY t.barbeiro_id, b.nome;  -- Agrupa pelo barbeiro_id e nome do barbeiro
    `;

    Promise.all([
        client.query(queryTransacoes, [mes, ano]),
        client.query(queryServicos, [mes, ano])
    ])
    .then(results => {
        const totalTransacoes = results[0].rows[0];
        const servicosPorBarbeiro = results[1].rows;

        res.render('relatorio_mensal', {
            mes,
            ano,
            total_entrada_mes: parseFloat(totalTransacoes.total_entrada_mes) || 0,
            total_saida_mes: parseFloat(totalTransacoes.total_saida_mes) || 0,
            saldo_mes: parseFloat(totalTransacoes.saldo_mes) || 0,
            servicosPorBarbeiro // Passando os serviços por barbeiro
        });
    })
    .catch(err => {
        console.error('Erro ao carregar dados:', err);
        res.status(500).send('Erro ao carregar relatório');
    });
});

app.post('/delete-transacao', async (req, res, next) => {
    const { id } = req.body; 

    const query = 'DELETE FROM transacao WHERE id = $1';

    try {
        await client.query(query, [id]); 
        res.redirect('/'); 
    } catch (err) {
        next(err); 
    }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
