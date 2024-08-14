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
            SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END) * 0.3 AS total_entrada,
            SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END) AS total_saida,
            (SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END) * 0.3) - SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END) AS saldo,
            SUM(CASE WHEN t.tipo = 'entrada' AND DATE(t.data) = CURDATE() THEN t.valor ELSE 0 END) * 0.3 AS total_entrada_dia,
            SUM(CASE WHEN t.tipo = 'saida' AND DATE(t.data) = CURDATE() THEN t.valor ELSE 0 END) AS total_saida_dia,
            SUM(CASE WHEN t.tipo = 'entrada' AND WEEK(t.data) = WEEK(CURDATE()) THEN t.valor ELSE 0 END) * 0.3 AS total_entrada_semana,
            SUM(CASE WHEN t.tipo = 'saida' AND WEEK(t.data) = WEEK(CURDATE()) THEN t.valor ELSE 0 END) AS total_saida_semana,
            SUM(CASE WHEN t.tipo = 'entrada' AND MONTH(t.data) = MONTH(CURDATE()) THEN t.valor ELSE 0 END) * 0.3 AS total_entrada_mes,
            SUM(CASE WHEN t.tipo = 'saida' AND MONTH(t.data) = MONTH(CURDATE()) THEN t.valor ELSE 0 END) AS total_saida_mes
        FROM barbeiros b
        LEFT JOIN transacao t ON t.barbeiro_id = b.id
        GROUP BY b.id, b.nome;
    `;

    db.query(queryBarbeiros, (err, resultBarbeiros) => {
        if (err) throw err;
        console.log("Resultado dos Barbeiros:", resultBarbeiros);
        const queryTransacoes = `
            SELECT
                t.id, t.tipo, t.forma_pagamento, t.valor, t.nome_do_item,
                DATE_FORMAT(t.data, '%Y-%m-%d') AS data, t.barbeiro_id, b.nome AS barbeiro
            FROM transacao t
            JOIN barbeiros b ON t.barbeiro_id = b.id;
        `;
        
        db.query(queryTransacoes, (err, transacoes) => {
            if (err) throw err;
            console.log("Resultado das Transações:", queryTransacoes);
            console.log("Resultado das Transações:", transacoes);
            const queryRelatorio = `
                SELECT 
                    SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END) AS total_entrada,
                    SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END) AS total_saida,
                    SUM(CASE WHEN t.tipo = 'entrada' AND DATE(t.data) = CURDATE() THEN t.valor ELSE 0 END) AS total_entrada_dia,
                    SUM(CASE WHEN t.tipo = 'saida' AND DATE(t.data) = CURDATE() THEN t.valor ELSE 0 END) AS total_saida_dia,
                    SUM(CASE WHEN t.tipo = 'entrada' AND WEEK(t.data) = WEEK(CURDATE()) THEN t.valor ELSE 0 END) AS total_entrada_semana,
                    SUM(CASE WHEN t.tipo = 'saida' AND WEEK(t.data) = WEEK(CURDATE()) THEN t.valor ELSE 0 END) AS total_saida_semana,
                    SUM(CASE WHEN t.tipo = 'entrada' AND MONTH(t.data) = MONTH(CURDATE()) THEN t.valor ELSE 0 END) AS total_entrada_mes,
                    SUM(CASE WHEN t.tipo = 'saida' AND MONTH(t.data) = MONTH(CURDATE()) THEN t.valor ELSE 0 END) AS total_saida_mes
                FROM transacao t;
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
    const { tipo, valor, data, forma_pagamento, nome_do_item, barbeiro_id } = req.body;
    const query = 'INSERT INTO transacao (tipo, valor, data, forma_pagamento, nome_do_item, barbeiro_id) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.query(query, [tipo, valor, data, forma_pagamento, nome_do_item, barbeiro_id], (err, result) => {
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

app.listen(3001, () => {
    console.log('Servidor rodando na porta 3001');
});

