const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Configuração da conexão com o banco de dados usando variáveis de ambiente
const db = mysql.createConnection({
    host: 'b9lsqlxrc1wrcggnqosi-mysql.services.clever-cloud.com',
    user: 'ugcnyroeqou4hr6n',
    password: 'fmIducXVC9LOVxi6KgPB',
    database: 'b9lsqlxrc1wrcggnqosi'
});

db.connect(err => {
    if (err) {
        console.error('Erro ao conectar no banco de dados:', err);
        process.exit(1); // Encerra o servidor caso a conexão falhe
    }
    console.log('Conectado ao banco de dados.');
});
// Middleware de tratamento de erros
function errorHandler(err, req, res, next) {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Ocorreu um erro devido a instabilidade no servidor tente novamente mais tarde, isso pode ser rápido de 5 à 20 minutos devido a grande demanda do servidor, obrigado por compreender.' });
}

// Rota principal - Obtém dados de barbeiros, transações e relatório geral
app.get('/', (req, res, next) => {
    const queryBarbeiros = `
        SELECT
            b.id AS id, 
            b.nome AS nome,
            COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor END) * 0.37, 0) AS total_entrada_servicos,
            COALESCE(SUM(CASE WHEN t.tipo = 'Produto' AND t.fechado = FALSE THEN t.valor * 0.10 END), 0) AS comissao_produtos,
            COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor END) * 0.37 + SUM(CASE WHEN t.tipo = 'Produto' AND t.fechado = FALSE THEN t.valor * 0.10 END), 0) AS total_rendimento,
            COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND t.fechado = FALSE THEN t.valor END), 0) AS total_saida,
            COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor END) * 0.37 - SUM(CASE WHEN t.tipo = 'saida' AND t.fechado = FALSE THEN t.valor END), 0) AS saldo,
            COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND DATE(t.data) = CURDATE() AND t.fechado = FALSE THEN t.valor END) * 0.37, 0) AS total_entrada_dia,
            COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND DATE(t.data) = CURDATE() AND t.fechado = FALSE THEN t.valor END), 0) AS total_saida_dia,
            COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND WEEK(t.data, 1) = WEEK(CURDATE(), 1) AND t.fechado = FALSE THEN t.valor END) * 0.37, 0) AS total_entrada_semana,
            COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND WEEK(t.data, 1) = WEEK(CURDATE(), 1) AND t.fechado = FALSE THEN t.valor END), 0) AS total_saida_semana,
            COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND MONTH(t.data) = MONTH(CURDATE()) AND t.fechado = FALSE THEN t.valor END) * 0.37, 0) AS total_entrada_mes,
            COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND MONTH(t.data) = MONTH(CURDATE()) AND t.fechado = FALSE THEN t.valor END), 0) AS total_saida_mes,
            COUNT(DISTINCT t.id) AS total_servicos,
            COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.servico = 'produto' AND t.fechado = FALSE THEN 1 END), 0) AS produtos
        FROM
            barbeiros b
        LEFT JOIN
            transacao t ON t.barbeiro_id = b.id
        GROUP BY
            b.id, b.nome
    `;

    db.query(queryBarbeiros, (err, resultBarbeiros) => {
        if (err) return next(err);

        const queryTransacoes = `
            SELECT
                t.id,
                t.tipo,
                t.forma_pagamento,
                t.valor,
                t.servico,
                t.nome_do_item,
                DATE_FORMAT(t.data, '%Y-%m-%d') AS data,
                t.barbeiro_id,
                b.nome AS barbeiro,
                t.fechado
            FROM
                transacao t
            JOIN
                barbeiros b ON t.barbeiro_id = b.id
            WHERE
                DATE(t.data) = CURDATE()
        `;

        db.query(queryTransacoes, (err, transacoes) => {
            if (err) return next(err);

            const queryRelatorio = `
                SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor END), 0) AS total_entrada,
    COALESCE(SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor END), 0) AS total_saida,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor END) - SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor END), 0) AS saldo_total,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND DATE(data) = CURDATE() AND fechado = FALSE THEN valor END), 0) AS total_entrada_dia,
    COALESCE(SUM(CASE WHEN tipo = 'saida' AND DATE(data) = CURDATE() AND fechado = FALSE THEN valor END), 0) AS total_saida_dia,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND WEEK(data, 1) = WEEK(CURDATE(), 1) AND fechado = FALSE THEN valor END), 0) AS total_entrada_semana,
    COALESCE(SUM(CASE WHEN tipo = 'saida' AND WEEK(data, 1) = WEEK(CURDATE(), 1) AND fechado = FALSE THEN valor END), 0) AS total_saida_semana,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND MONTH(data) = MONTH(CURDATE()) AND fechado = FALSE THEN valor END), 0) AS total_entrada_mes,
    COALESCE(SUM(CASE WHEN tipo = 'saida' AND MONTH(data) = MONTH(CURDATE()) AND fechado = FALSE THEN valor END), 0) AS total_saida_mes,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor END) - SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor END), 0) AS saldo_total
FROM
    transacao
            `;

            db.query(queryRelatorio, (err, resultRelatorio) => {
                if (err) return next(err);

                res.render('app', {
                    barbeiros: resultBarbeiros,
                    transacoes: transacoes,
                    relatorio: resultRelatorio[0]
                });
            });
        });
    });
});

// Rota para adicionar uma nova transação
app.post('/transacao', (req, res, next) => {
    const { tipo, valor, servico, forma_pagamento, barbeiro_id, nome_do_item } = req.body;

    // Validação básica dos dados de entrada
    if (!tipo || !valor || !servico || !forma_pagamento || !barbeiro_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const query = `
        INSERT INTO transacao (tipo, valor, servico, forma_pagamento, barbeiro_id, nome_do_item, data)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE)
    `;

    db.query(
        query,
        [tipo, valor, servico, forma_pagamento, barbeiro_id, nome_do_item || null],
        (err, result) => {
            if (err) return next(err);
           res.redirect('/');
        }
    );
});

// Rota para editar uma transação existente
app.post('/update-transacao', (req, res, next) => {   
    try {
     
    const { id, tipo, valor, data, forma_pagamento, nome_do_item, barbeiro_id } = req.body;
    const query = `
        UPDATE transacao
        SET tipo = ?, valor = ?, data = ?, forma_pagamento = ?, nome_do_item = ?, barbeiro_id = ?
        WHERE id = ?
    `;

    db.query(
        query,
        [tipo, valor, data, forma_pagamento, nome_do_item || null, barbeiro_id, id],
        (err, result) => {
            if (err) return next(err);
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Transação não encontrada.' });
            }
           res.redirect('/');
        }
    );
        
} catch (error) {
        console.error("teste", error);
}
});

// Rota para deletar uma transação
app.post('/delete-transacao', (req, res, next) => {
    const { id } = req.body; // Use req.body ao invés de req.params

    const query = 'DELETE FROM transacao WHERE id = ?';

    db.query(query, [id], (err, result) => {
        if (err) return next(err);        
        res.redirect('/');
    });
});

// Rota para obter os serviços de um barbeiro específico
app.get('/barbeiro-servicos/:id', (req, res, next) => {
    const { id } = req.params;

    const query = `
        SELECT 
            COUNT(*) AS total_servicos,
            SUM(CASE WHEN tipo = 'entrada' AND servico = 'corte' THEN 1 ELSE 0 END) AS cortes,
            SUM(CASE WHEN tipo = 'entrada' AND servico = 'barba' THEN 1 ELSE 0 END) AS barbas,
            SUM(CASE WHEN tipo = 'entrada' AND servico = 'produto' THEN 1 ELSE 0 END) AS produtos,
            SUM(CASE WHEN tipo = 'entrada' AND servico = 'progressiva' THEN 1 ELSE 0 END) AS progressivas,
            SUM(CASE WHEN tipo = 'entrada' AND servico = 'saida' THEN 1 ELSE 0 END) AS saidas
        FROM
            transacao
        WHERE
            barbeiro_id = ?
    `;

    db.query(query, [id], (err, result) => {
        if (err) return next(err);
        res.json(result[0]);
    });
});


// Rota para obter o relatório de rendimentos e despesas de um barbeiro específico
app.get('/barbeiro-relatorio/:id', (req, res, next) => {
    const { id } = req.params;

    const query = `
        SELECT 
            COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor * 0.37 END), 0) AS rendimento_servicos,
            COALESCE(SUM(CASE WHEN tipo = 'Produto' THEN valor * 0.10 END), 0) AS comissao_produtos,
            COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor * 0.37 END) + SUM(CASE WHEN tipo = 'Produto' THEN valor * 0.10 END), 0) AS total_rendimento,
            COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor END), 0) AS total_saida,
            COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor * 0.37 END) - SUM(CASE WHEN tipo = 'saida' THEN valor END), 0) AS saldo
        FROM
            transacao
        WHERE
            barbeiro_id = ?
    `;

    db.query(query, [id], (err, result) => {
        if (err) return next(err);
        res.json(result[0]);
    });
});

// Rota para fechamento de caixa a cada 15 dias
app.post('/fechar-caixa', (req, res, next) => {
    const query = 'UPDATE transacao SET fechado = TRUE WHERE fechado = FALSE';

    db.query(query, (err, result) => {
        if (err) return next(err);
        res.json({ message: 'Caixa fechado com sucesso.' });
    });
});

// Rota para relatório mensal de receita, rendimentos e despesas
app.get('/relatorio-mensal', (req, res) => {
    const { mes, ano } = req.query;

    // Consulta SQL para somar as entradas e saídas do mês especificado
    const query = `
        SELECT
            SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS total_entrada_mes,
            SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) AS total_saida_mes,
            (SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END)) AS saldo_mes
        FROM transacao
        WHERE MONTH(data) = ? AND YEAR(data) = ?;
    `;

    db.query(query, [mes, ano], (err, result) => {
        if (err) return next(err);

        const total_entrada_mes = parseFloat(result[0].total_entrada_mes) || 0;
        const total_saida_mes = parseFloat(result[0].total_saida_mes) || 0;
        const saldo_mes = parseFloat(result[0].saldo_mes) || 0;

        res.render('relatorio_mensal', {
            mes: mes,
            ano: ano,
            total_entrada_mes: total_entrada_mes,
            total_saida_mes: total_saida_mes,
            saldo_mes: saldo_mes
        });
    });
});

// Middleware de tratamento de erros deve ser o último middleware adicionado
app.use(errorHandler);

// Iniciando o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
