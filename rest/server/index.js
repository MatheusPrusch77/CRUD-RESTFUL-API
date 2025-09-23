let express = require('express');
let bodyParser = require('body-parser');
 let cors = require('cors');
let mongoose = require('mongoose');
let methodOverride = require('method-override');
let https = require('https');
 
// criar o objeto
 
let app = express();
const port = 3000;
 
//Vincule middlewares
app.use(cors());
 
app.use(methodOverride('X-HTTP-Method'));
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(methodOverride('X-Method-Override'));
app.use(methodOverride('_Method'));
 
app.use((req,res,next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next()
})
 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
 
//fazer a conexão com o mongoose
let url = 'mongodb://localhost:27017/FatecVotorantim'

console.log('Tentando conectar ao MongoDB...');
mongoose.connect(url)
.then(()=> {
    console.log('✅ Conexão com o MongoDB estabelecida com sucesso!');
    console.log('📊 Banco de dados: FatecVotorantim');
})
.catch((err)=> {
    console.error('❌ Erro ao conectar com MongoDB:', err);
    console.log('💡 Verifique se o MongoDB está rodando na porta 27017');
})

// Schema para Alunos
const alunoSchema = new mongoose.Schema({
  matricula: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  endereco: {
    cep: { type: String, required: true },
    logradouro: { type: String, required: true },
    cidade: { type: String, required: true },
    bairro: { type: String, required: true },
    estado: { type: String, required: true },
    numero: { type: String, required: true },
    complemento: { type: String }
  },
  cursos: [{ type: String }]
}, { timestamps: true });

var Aluno = mongoose.model('Aluno', alunoSchema);

// Gerar matrícula única
const gerarMatricula = () => {
    const ano = new Date().getFullYear();
    const numero = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `${ano}${numero}`;
};

// Função para fazer requisição HTTPS
const fazerRequisicao = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
};

// Buscar endereço pelo CEP via ViaCEP
app.get('/buscar-cep/:cep', async(req, res) => {
    try {
        const { cep } = req.params;
        const cepLimpo = cep.replace(/\D/g, '');
        
        if (cepLimpo.length !== 8) {
            return res.status(400).json({ error: "CEP deve ter 8 dígitos" });
        }
        
        console.log(`Buscando CEP: ${cepLimpo}`);
        const data = await fazerRequisicao(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        
        if (data.erro) {
            return res.status(404).json({ error: "CEP não encontrado" });
        }
        
        console.log('CEP encontrado:', data);
        res.json({
            cep: data.cep,
            logradouro: data.logradouro,
            cidade: data.localidade,
            bairro: data.bairro,
            estado: data.uf
        });
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        res.status(500).json({ error: "Erro ao buscar CEP" });
    }
});

// Criar aluno
app.post('/alunos', async(req, res) => {
    try {
        console.log('📝 Recebendo dados para criar aluno:', req.body);
        const { nome, endereco, cursos } = req.body;
        
        if (!nome || !endereco || !cursos || !Array.isArray(cursos)) {
            console.log('❌ Dados obrigatórios faltando');
            return res.status(400).json({ error: "Dados obrigatórios: nome, endereco e cursos" });
        }
        
        const matricula = gerarMatricula();
        console.log('🎫 Matrícula gerada:', matricula);
        
        const aluno = new Aluno({
            matricula,
            nome,
            endereco,
            cursos
        });
        
        console.log('💾 Salvando aluno no MongoDB...');
        console.log('📊 Conexão MongoDB ativa:', mongoose.connection.readyState === 1);
        console.log('📊 Banco de dados:', mongoose.connection.db.databaseName);
        
        const alunoSalvo = await aluno.save();
        console.log('✅ Aluno inserido com sucesso:', alunoSalvo.nome);
        console.log('📊 ID do aluno salvo:', alunoSalvo._id);
        
        res.json({status: "adicionado com sucesso", aluno: alunoSalvo});
    } catch (error) {
        console.error('❌ Erro ao inserir aluno:', error);
        console.error('❌ Detalhes do erro:', error.message);
        console.error('❌ Código do erro:', error.code);
        if (error.code === 11000) {
            res.status(400).json({ error: "Matrícula já existe" });
        } else {
            res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
})

// Buscar todos os alunos
app.get('/alunos', async(req, res) => {
    try {
        console.log('🔍 Buscando todos os alunos...');
        const alunos = await Aluno.find({}).sort({ createdAt: -1 });
        console.log(`📊 Encontrados ${alunos.length} alunos`);
        
        res.json({
            status: "sucesso",
            total: alunos.length,
            alunos: alunos
        });
    } catch (error) {
        console.error('❌ Erro ao buscar alunos:', error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Buscar aluno por ID
app.get('/alunos/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const aluno = await Aluno.findById(id);
        
        if (!aluno) {
            return res.status(404).json({ error: "Aluno não encontrado" });
        }
        
        res.json({ status: "sucesso", aluno: aluno });
    } catch (error) {
        console.error('Erro ao buscar aluno:', error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Atualizar aluno
app.put('/alunos/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const { nome, endereco, cursos } = req.body;
        
        console.log('✏️ Recebendo dados para atualizar aluno:', { id, nome, endereco, cursos });
        
        if (!nome || !endereco || !cursos || !Array.isArray(cursos)) {
            console.log('❌ Dados obrigatórios faltando para atualização');
            return res.status(400).json({ error: "Dados obrigatórios: nome, endereco e cursos" });
        }
        
        console.log('🔍 Buscando aluno com ID:', id);
        const alunoExistente = await Aluno.findById(id);
        if (!alunoExistente) {
            console.log('❌ Aluno não encontrado com ID:', id);
            return res.status(404).json({ error: "Aluno não encontrado" });
        }
        
        console.log('📝 Aluno encontrado:', alunoExistente.nome);
        console.log('💾 Atualizando dados...');
        
        const aluno = await Aluno.findByIdAndUpdate(
            id,
            { nome, endereco, cursos },
            { new: true, runValidators: true }
        );
        
        console.log('✅ Aluno atualizado com sucesso:', aluno);
        res.json({ status: "atualizado com sucesso", aluno: aluno });
    } catch (error) {
        console.error('❌ Erro ao atualizar aluno:', error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Deletar aluno por ID
app.delete('/alunos/:id', async(req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ Tentando deletar aluno com ID:', id);
        
        // Verificar se o aluno existe antes de deletar
        const alunoExistente = await Aluno.findById(id);
        if (!alunoExistente) {
            console.log('❌ Aluno não encontrado com ID:', id);
            return res.status(404).json({ error: "Aluno não encontrado" });
        }
        
        console.log('📝 Aluno encontrado para deletar:', alunoExistente.nome);
        
        // Deletar o aluno
        const aluno = await Aluno.findByIdAndDelete(id);
        console.log('✅ Aluno deletado com sucesso:', aluno.nome);
        
        // Verificar se foi realmente deletado
        const alunoVerificacao = await Aluno.findById(id);
        if (alunoVerificacao) {
            console.log('❌ ERRO: Aluno ainda existe após exclusão!');
            return res.status(500).json({ error: "Erro: Aluno não foi deletado corretamente" });
        }
        
        console.log('✅ Confirmação: Aluno não existe mais no banco de dados');
        
        res.json({ 
            status: "deletado com sucesso", 
            aluno: aluno,
            confirmacao: "Aluno removido do banco de dados com sucesso"
        });
    } catch (error) {
        console.error('❌ Erro ao deletar aluno:', error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Deletar aluno por matrícula
app.delete('/alunos/matricula/:matricula', async(req, res) => {
    try {
        const { matricula } = req.params;
        console.log('🗑️ Tentando deletar aluno com matrícula:', matricula);
        
        // Verificar se o aluno existe antes de deletar
        const alunoExistente = await Aluno.findOne({ matricula: matricula });
        if (!alunoExistente) {
            console.log('❌ Aluno não encontrado com matrícula:', matricula);
            return res.status(404).json({ error: "Aluno não encontrado" });
        }
        
        console.log('📝 Aluno encontrado para deletar:', alunoExistente.nome, 'Matrícula:', alunoExistente.matricula);
        
        // Deletar o aluno
        const aluno = await Aluno.findOneAndDelete({ matricula: matricula });
        console.log('✅ Aluno deletado com sucesso:', aluno.nome, 'Matrícula:', aluno.matricula);
        
        // Verificar se foi realmente deletado
        const alunoVerificacao = await Aluno.findOne({ matricula: matricula });
        if (alunoVerificacao) {
            console.log('❌ ERRO: Aluno ainda existe após exclusão!');
            return res.status(500).json({ error: "Erro: Aluno não foi deletado corretamente" });
        }
        
        console.log('✅ Confirmação: Aluno não existe mais no banco de dados');
        
        res.json({ 
            status: "deletado com sucesso", 
            aluno: aluno,
            confirmacao: "Aluno removido do banco de dados com sucesso por matrícula"
        });
    } catch (error) {
        console.error('❌ Erro ao deletar aluno por matrícula:', error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});


//Middleware to parse json bodies rota
app.get('/', (req, res)=>{
    res.send({status: "ok"})
})
 
app.listen(port, () =>{
    console.log('🚀 Servidor iniciado com sucesso!');
    console.log(`🌐 Servidor rodando em: http://localhost:${port}`);
    console.log('📋 Rotas disponíveis:');
    console.log('   GET  / - Status do servidor');
    console.log('   GET  /buscar-cep/:cep - Buscar endereço por CEP');
    console.log('   POST /alunos - Criar aluno');
    console.log('   GET  /alunos - Listar todos os alunos');
    console.log('   GET  /alunos/:id - Buscar aluno por ID');
    console.log('   PUT  /alunos/:id - Atualizar aluno');
    console.log('   DELETE /alunos/:id - Deletar aluno');
})