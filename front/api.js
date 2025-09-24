const API_BASE_URL = 'http://192.168.50.53:3000';

// Classe para gerenciar todas as operações HTTP
class AlunoAPI {
  // Buscar endereço pelo CEP
  static async buscarCEP(cep) {
    try {
      const response = await fetch(`${API_BASE_URL}/buscar-cep/${cep}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar CEP');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na requisição: ${error.message}`);
    }
  }

  // Criar aluno
  static async createAluno(alunoData) {
    try {
      const response = await fetch(`${API_BASE_URL}/alunos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alunoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar aluno');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na requisição: ${error.message}`);
    }
  }

  // Buscar todos os alunos
  static async getAllAlunos() {
    try {
      const response = await fetch(`${API_BASE_URL}/alunos`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar alunos');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na requisição: ${error.message}`);
    }
  }

  // Buscar aluno por ID
  static async getAlunoById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/alunos/${id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar aluno');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na requisição: ${error.message}`);
    }
  }

  // Atualizar aluno
  static async updateAluno(id, alunoData) {
    try {
      const response = await fetch(`${API_BASE_URL}/alunos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alunoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar aluno');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na requisição: ${error.message}`);
    }
  }

  // Deletar aluno por ID
  static async deleteAluno(id) {
    try {
      console.log('🌐 API: Iniciando exclusão do aluno ID:', id);
      console.log('🌐 API: URL da requisição:', `${API_BASE_URL}/alunos/${id}`);
      
      const response = await fetch(`${API_BASE_URL}/alunos/${id}`, {
        method: 'DELETE',
      });

      console.log('🌐 API: Status da resposta:', response.status);
      console.log('🌐 API: Headers da resposta:', response.headers);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🌐 API: Erro na resposta:', errorData);
        throw new Error(errorData.error || 'Erro ao deletar aluno');
      }

      const result = await response.json();
      console.log('🌐 API: Resposta de sucesso:', result);
      return result;
    } catch (error) {
      console.error('🌐 API: Erro na requisição:', error);
      throw new Error(`Erro na requisição: ${error.message}`);
    }
  }

  // Deletar aluno por matrícula
  static async deleteAlunoByMatricula(matricula) {
    try {
      const response = await fetch(`${API_BASE_URL}/alunos/matricula/${matricula}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar aluno por matrícula');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na requisição: ${error.message}`);
    }
  }

  // Testar conexão com o servidor
  static async testConnection() {
    try {
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Servidor não está respondendo');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro de conexão: ${error.message}`);
    }
  }


  // Verificar se o servidor está online
  static async isServerOnline() {
    try {
      await this.testConnection();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default AlunoAPI;
