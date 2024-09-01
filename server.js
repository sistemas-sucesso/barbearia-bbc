const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: 'b9lsqlxrc1wrcggnqosi-mysql.services.clever-cloud.com',
    user: 'ugcnyroeqou4hr6n',
    password: 'fmIducXVC9LOVxi6KgPB',
    database: 'b9lsqlxrc1wrcggnqosi'
});

db.connect(err => {
    if (err) throw err;
    console.log('Conectado ao banco de dados.');
});

// Rota para obter os dados dos barbeiros e suas transações
app.get('/', (req, res) => {
    const queryBarbeiros = `
      SELECT
        b.id AS id, 
        b.nome AS nome,
        COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor ELSE 0 END) * 0.37, 0) AS total_entrada_servicos,
        COALESCE(SUM(IF(t.tipo = 'Produto' AND t.fechado = FALSE, t.valor * 0.10, 0)), 0) AS comissao_produtos,
        COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor ELSE 0 END) * 0.37, 0) +
        COALESCE(SUM(IF(t.tipo = 'Produto' AND t.fechado = FALSE, t.valor * 0.10, 0)), 0) AS total_rendimento,
        COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND t.fechado = FALSE THEN t.valor ELSE 0 END), 0) AS total_saida,
        COALESCE((SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor ELSE 0 END) * 0.37) - SUM(CASE WHEN t.tipo = 'saida' AND t.fechado = FALSE THEN t.valor ELSE 0 END), 0) AS saldo,
        COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND DATE(t.data) = CURDATE() AND t.fechado = FALSE THEN t.valor ELSE 0 END) * 0.37, 0) AS total_entrada_dia,
        COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND DATE(t.data) = CURDATE() AND t.fechado = FALSE THEN t.valor ELSE 0 END), 0) AS total_saida_dia,
        COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND WEEK(t.data) = WEEK(CURDATE()) AND t.fechado = FALSE THEN t.valor ELSE 0 END) * 0.37, 0) AS total_entrada_semana,
        COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND WEEK(t.data) = WEEK(CURDATE()) AND t.fechado = FALSE THEN t.valor ELSE 0 END), 0) AS total_saida_semana,
        COALESCE(SUM(CASE WHEN t.tipo = 'entrada' AND MONTH(t.data) = MONTH(CURDATE()) AND t.fechado = FALSE THEN t.valor ELSE 0 END) * 0.37, 0) AS total_entrada_mes,
        COALESCE(SUM(CASE WHEN t.tipo = 'saida' AND MONTH(t.data) = MONTH(CURDATE()) AND t.fechado = FALSE THEN t.valor ELSE 0 END), 0) AS total_saida_mes,
        COUNT(*) AS total_servicos,
        COALESCE(SUM(IF(t.tipo = 'entrada' AND t.servico = 'produto' AND t.fechado = FALSE, 1, 0)), 0) AS produtos
    FROM barbeiros b
    LEFT JOIN transacao t ON t.barbeiro_id = b.id
    GROUP BY b.id, b.nome
    `;

    db.query(queryBarbeiros, (err, resultBarbeiros) => {
        if (err) throw err;
        console.log("Resultado dos Barbeiros:", resultBarbeiros);
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
    DATE(t.data) = CURDATE();

        `;
        
        db.query(queryTransacoes, (err, transacoes) => {
            if (err) throw err;
            console.log("Resultado das Transações:", queryTransacoes);
            console.log("Resultado das Transações:", transacoes);
            const queryRelatorio = `
               SELECT 
        SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS total_entrada,
        SUM(CASE WHEN t.tipo = 'saida' AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS total_saida,
        SUM(CASE WHEN t.tipo = 'entrada' AND t.fechado = FALSE THEN t.valor ELSE 0 END) -
        SUM(CASE WHEN t.tipo = 'saida' AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS saldo_total,
        SUM(CASE WHEN t.tipo = 'entrada' AND DATE(t.data) = CURDATE() AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS total_entrada_dia,
        SUM(CASE WHEN t.tipo = 'saida' AND DATE(t.data) = CURDATE() AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS total_saida_dia,
        SUM(CASE WHEN t.tipo = 'entrada' AND WEEK(t.data) = WEEK(CURDATE()) AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS total_entrada_semana,
        SUM(CASE WHEN t.tipo = 'saida' AND WEEK(t.data) = WEEK(CURDATE()) AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS total_saida_semana,
        SUM(CASE WHEN t.tipo = 'entrada' AND MONTH(t.data) = MONTH(CURDATE()) AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS total_entrada_mes,
        SUM(CASE WHEN t.tipo = 'saida' AND MONTH(t.data) = MONTH(CURDATE()) AND t.fechado = FALSE THEN t.valor ELSE 0 END) AS total_saida_mes
    FROM transacao t
            `;

            db.query(queryRelatorio, (err, resultRelatorio) => {
                if (err) throw err;
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
app.post('/transacao', (req, res) => {
    const { tipo, valor, servico, forma_pagamento, barbeiro_id } = req.body;
    const query = 'INSERT INTO transacao (tipo, valor, servico, forma_pagamento, barbeiro_id, data) VALUES (?, ?, ?, ?, ?, CURRENT_DATE)';
    
    db.query(query, [tipo, valor, servico, forma_pagamento, barbeiro_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao inserir transação.');
        }
        res.redirect('/');
    });
});

// Rota para editar uma transação existente
app.post('/update-transacao', (req, res) => {
    const { id, nome_do_item, tipo, valor, data, forma_pagamento, barbeiro_id } = req.body;
    const query = 'UPDATE transacao SET tipo = ?, valor = ?, data = ?, forma_pagamento = ?, nome_do_item = ?, barbeiro_id = ? WHERE id = ?';
    db.query(query, [tipo, valor, data, forma_pagamento, nome_do_item, barbeiro_id, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao editar transação.');
        }
        res.redirect('/');
    });
});

// Rota para deletar uma transação
app.post('/delete-transacao', (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM transacao WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao deletar transação.');
        }
        res.redirect('/');
    });
});

///////////////////////
app.get('/barbeiro-servicos/:id', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT 
            COUNT(*) AS total_servicos,
            SUM(IF(tipo = 'entrada' AND servico = 'corte', 1, 0)) AS cortes,
            SUM(IF(tipo = 'entrada' AND servico = 'barba', 1, 0)) AS barbas,
            SUM(IF(tipo = 'entrada' AND servico = 'produto', 1, 0)) AS produto,
            SUM(IF(tipo = 'entrada' AND servico = 'queratina', 1, 0)) AS queratina,
            SUM(IF(tipo = 'entrada' AND servico = 'alisamento', 1, 0)) AS alisamentos
        FROM transacao
        WHERE barbeiro_id = ?;
    `;
    db.query(query, [id], (err, result) => {
        if (err) throw err;
        res.json(result[0]);
    });
});


// Rota para obter o relatório de rendimentos e despesas
app.get('/barbeiro-relatorio/:id', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT 
            COALESCE(SUM(valor * 0.37), 0) AS rendimento_servicos,
            COALESCE(SUM(IF(tipo = 'Produto', valor * 0.10, 0)), 0) AS comissao_produtos,
            COALESCE((SUM(valor * 0.37) + SUM(IF(tipo = 'Produto', valor * 0.10, 0))), 0) AS total_rendimento
        FROM transacao
        WHERE barbeiro_id = ?;
    `;
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erro na consulta:', err);
            res.status(500).json({ error: 'Erro na consulta' });
            return;
        }
        console.log('Resultado da consulta:', result[0]); // Adicione esta linha para depuração
        res.json(result[0]);
    });
});



// Rota para fechamento de caixa a cada 15 dias
app.post('/fechar-caixa', (req, res) => {
    const query = 'UPDATE transacao SET fechado = TRUE WHERE fechado = FALSE';
    db.query(query, (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Rota para relatório mensal de receita, rendimentos, e despesas
app.get('/relatorio-mensal/:mes/:ano', (req, res) => {
    const { mes, ano } = req.params;
    const query = `
        SELECT 
            SUM(valor) AS receita_total,
            SUM(valor * 0.37) AS rendimentos_totais,
            SUM(despesas) AS despesas_totais
        FROM transacao
        WHERE MONTH(data) = ? AND YEAR(data) = ?;
    `;
    db.query(query, [mes, ano], (err, result) => {
        if (err) throw err;
        res.json(result[0]);
    });
});
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
        if (err) throw err;

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

app.listen(3001, () => {
    console.log('Servidor rodando na porta 3001');
});

