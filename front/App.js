import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AlunoAPI from './api';

const CURSOS_DISPONIVEIS = ['DSM', 'CDN', 'CO'];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('list'); // 'list' ou 'cadastro'
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [logs, setLogs] = useState(['Sistema iniciado']);

  // Estados do formulário de cadastro
  const [nome, setNome] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState({
    cep: '',
    logradouro: '',
    cidade: '',
    bairro: '',
    estado: '',
    numero: '',
    complemento: ''
  });
  const [cursosSelecionados, setCursosSelecionados] = useState([]);
  const [buscandoCEP, setBuscandoCEP] = useState(false);

  // Estados para modal de visualização/edição
  const [modalVisible, setModalVisible] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);

  // Adicionar log
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  // Mostrar notificação de sucesso
  const showSuccessNotification = (title, message) => {
    Alert.alert(
      `✅ ${title}`, 
      message,
      [
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );
  };

  // Mostrar notificação de erro
  const showErrorNotification = (title, message) => {
    Alert.alert(
      `❌ ${title}`, 
      message,
      [
        {
          text: 'OK',
          style: 'destructive'
        }
      ]
    );
  };

  // Verificar status do servidor
  const checkServerStatus = async () => {
    try {
      const isOnline = await AlunoAPI.isServerOnline();
      const previousStatus = serverStatus;
      setServerStatus(isOnline ? 'online' : 'offline');
      
      // Só adiciona log se o status mudou
      if (previousStatus !== (isOnline ? 'online' : 'offline')) {
        addLog(`Servidor ${isOnline ? 'online' : 'offline'}`);
      }
    } catch (error) {
      setServerStatus('offline');
      addLog('Erro ao verificar servidor');
    }
  };

  // Buscar alunos do servidor
  const fetchAlunos = async (source = 'manual') => {
    try {
      setRefreshing(true);
      addLog(`Buscando alunos do servidor... (${source})`);
      console.log(`🔍 Buscando alunos do servidor... (${source})`);
      
      if (serverStatus === 'online') {
        const result = await AlunoAPI.getAllAlunos();
        console.log('📊 Resultado da busca:', result);
        
        if (result.alunos) {
          console.log('✅ Alunos encontrados:', result.alunos.length);
          setAlunos(result.alunos);
          addLog(`${result.total} alunos carregados do servidor (${source})`);
        }
      } else {
        addLog('Servidor offline - mantendo lista local');
        console.log('⚠️ Servidor offline - mantendo lista local');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar alunos:', error);
      addLog(`Erro ao buscar alunos: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Buscar endereço pelo CEP
  const buscarEnderecoPorCEP = async (cepValue) => {
    if (cepValue.length !== 8) return;
    
    try {
      setBuscandoCEP(true);
      const enderecoData = await AlunoAPI.buscarCEP(cepValue);
      setEndereco(prev => ({
        ...prev,
        cep: enderecoData.cep,
        logradouro: enderecoData.logradouro,
        cidade: enderecoData.cidade,
        bairro: enderecoData.bairro,
        estado: enderecoData.estado
      }));
      addLog(`Endereço encontrado para CEP ${cepValue}`);
    } catch (error) {
      addLog(`Erro ao buscar CEP: ${error.message}`);
      Alert.alert('Erro', error.message);
    } finally {
      setBuscandoCEP(false);
    }
  };

  // Toggle curso selecionado
  const toggleCurso = (curso) => {
    setCursosSelecionados(prev => 
      prev.includes(curso) 
        ? prev.filter(c => c !== curso)
        : [...prev, curso]
    );
  };

  // Salvar aluno
  const salvarAluno = async () => {
    console.log('💾 Salvando aluno...', { modoEdicao, alunoSelecionado: alunoSelecionado?._id });
    
    if (!nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }
    if (cursosSelecionados.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um curso');
      return;
    }
    if (!endereco.numero.trim()) {
      Alert.alert('Erro', 'Número do endereço é obrigatório');
      return;
    }

    try {
      setLoading(true);
      const alunoData = {
        nome: nome.trim(),
        endereco: {
          ...endereco,
          numero: endereco.numero.trim(),
          complemento: endereco.complemento.trim()
        },
        cursos: cursosSelecionados
      };

      console.log('📝 Dados do aluno:', alunoData);

      if (modoEdicao && alunoSelecionado) {
        // Editar aluno existente
        console.log('✏️ Editando aluno existente:', alunoSelecionado._id);
        const result = await AlunoAPI.updateAluno(alunoSelecionado._id, alunoData);
        console.log('✅ Resultado da edição:', result);
        addLog(`Aluno "${nome}" atualizado com sucesso`);
        setAlunos(prev => prev.map(aluno => 
          aluno._id === alunoSelecionado._id ? result.aluno : aluno
        ));
        Alert.alert('Sucesso', 'Aluno atualizado com sucesso!');
        fecharModal();
        setCurrentScreen('list');
      } else {
        // Criar novo aluno
        console.log('➕ Criando novo aluno');
        const result = await AlunoAPI.createAluno(alunoData);
        console.log('✅ Resultado da criação:', result);
        addLog(`Aluno "${nome}" criado com sucesso`);
        setAlunos(prev => [result.aluno, ...prev]);
        Alert.alert('Sucesso', 'Aluno criado com sucesso!');
        limparFormulario();
        setCurrentScreen('list');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar aluno:', error);
      addLog(`Erro ao salvar aluno: ${error.message}`);
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Deletar aluno
  const deletarAluno = async (aluno) => {
    try {
      setLoading(true);
      console.log('📡 Enviando requisição DELETE para:', `http://localhost:3000/alunos/${aluno._id}`);
      
      const response = await AlunoAPI.deleteAluno(aluno._id);
      console.log('📥 Resposta do servidor:', response);
      
      if (response && response.status === 'deletado com sucesso') {
        console.log('✅ Exclusão confirmada pelo servidor');
        Alert.alert('Sucesso', 'Aluno excluído com sucesso!');
        
        console.log('🔄 Recarregando lista de alunos...');
        await fetchAlunos('exclusao');
        console.log('✅ Lista de alunos recarregada');
      } else {
        console.error('❌ Resposta inesperada do servidor:', response);
        Alert.alert('Erro', 'Resposta inesperada do servidor');
      }
    } catch (error) {
      console.error('❌ ERRO DURANTE EXCLUSÃO:', error);
      console.error('❌ Mensagem de erro:', error.message);
      Alert.alert('Erro', `Erro ao excluir aluno: ${error.message}`);
    } finally {
      setLoading(false);
      console.log('🏁 Processo de exclusão finalizado');
    }
  };

  // Abrir modal para visualizar/editar
  const abrirModal = (aluno, editar = false) => {
    console.log('🔍 Abrindo modal:', { aluno: aluno.nome, editar });
    setAlunoSelecionado(aluno);
    setModoEdicao(editar);
    
    if (editar) {
      console.log('✏️ Preenchendo formulário para edição');
      setNome(aluno.nome);
      setCep(aluno.endereco.cep);
      setEndereco(aluno.endereco);
      setCursosSelecionados([...aluno.cursos]);
      setCurrentScreen('cadastro'); // Mudar para tela de cadastro quando editar
    }
    
    setModalVisible(true);
  };

  // Fechar modal
  const fecharModal = () => {
    setModalVisible(false);
    setAlunoSelecionado(null);
    setModoEdicao(false);
    limparFormulario();
  };

  // Limpar formulário
  const limparFormulario = () => {
    setNome('');
    setCep('');
    setEndereco({
      cep: '',
      logradouro: '',
      cidade: '',
      bairro: '',
      estado: '',
      numero: '',
      complemento: ''
    });
    setCursosSelecionados([]);
  };

  // Verificar status do servidor ao iniciar
  useEffect(() => {
    checkServerStatus();
    fetchAlunos('inicial');
    const interval = setInterval(checkServerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Buscar CEP quando digitado
  useEffect(() => {
    if (cep.length === 8) {
      buscarEnderecoPorCEP(cep);
    }
  }, [cep]);

  // Monitorar mudanças no estado de alunos
  useEffect(() => {
    console.log('🔄 Estado de alunos mudou:', alunos.length, 'alunos');
    console.log('📊 Alunos atuais:', alunos.map(a => ({ nome: a.nome, id: a._id })));
  }, [alunos]);

  // Renderizar item da lista de alunos
  const renderAlunoItem = ({ item }) => (
    <View style={styles.alunoCard}>
      <View style={styles.alunoInfo}>
        <Text style={styles.alunoNome}>{item.nome}</Text>
        <Text style={styles.alunoMatricula}>Matrícula: {item.matricula}</Text>
        <Text style={styles.alunoEndereco}>
          {item.endereco.cidade} - {item.endereco.estado}
        </Text>
        <Text style={styles.alunoCursos}>
          Cursos: {item.cursos.join(', ')}
        </Text>
      </View>
      <View style={styles.alunoActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => abrirModal(item, false)}
        >
          <Text style={styles.actionButtonText}>👁️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => abrirModal(item, true)}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            console.log('🖱️ BOTÃO DE EXCLUSÃO CLICADO');
            console.log('📊 Item clicado:', item);
            deletarAluno(item);
          }}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Renderizar status do servidor
  const renderServerStatus = () => {
    const statusConfig = {
      checking: { text: 'Verificando...', color: '#ffc107', icon: '⏳' },
      online: { text: 'Servidor Online', color: '#28a745', icon: '🟢' },
      offline: { text: 'Servidor Offline', color: '#dc3545', icon: '🔴' },
    };

    const config = statusConfig[serverStatus];
    
    return (
      <View style={[styles.serverStatus, { backgroundColor: config.color }]}>
        <Text style={styles.serverStatusText}>
          {config.icon} {config.text}
        </Text>
      </View>
    );
  };

  // Renderizar tela de listagem
  const renderListScreen = () => (
    <ScrollView 
      style={styles.content} 
      showsVerticalScrollIndicator={false}
      // refreshControl={
      //   <RefreshControl
      //     refreshing={refreshing}
      //     onRefresh={fetchAlunos}
      //     colors={['#2196F3']}
      //     tintColor="#2196F3"
      //   />
      // }
    >
      {/* Estatísticas */}
      {alunos.length > 0 && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Estatísticas</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{alunos.length}</Text>
              <Text style={styles.statLabel}>Total de Alunos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {alunos.filter(aluno => aluno.cursos.includes('DSM')).length}
              </Text>
              <Text style={styles.statLabel}>DSM</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {alunos.filter(aluno => aluno.cursos.includes('CDN')).length}
              </Text>
              <Text style={styles.statLabel}>CDN</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {alunos.filter(aluno => aluno.cursos.includes('CO')).length}
              </Text>
              <Text style={styles.statLabel}>CO</Text>
            </View>
          </View>
        </View>
      )}

      {/* Lista de alunos */}
      <View style={styles.alunosSection}>
        <View style={styles.alunosHeader}>
          <Text style={styles.sectionTitle}>👥 Alunos Cadastrados</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => fetchAlunos('refresh')}
          >
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
        
        {alunos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum aluno cadastrado</Text>
            <Text style={styles.emptySubtext}>Adicione um aluno para começar</Text>
          </View>
        ) : (
          <FlatList
            data={alunos}
            renderItem={renderAlunoItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Logs */}
      <View style={styles.logsSection}>
        <Text style={styles.sectionTitle}>📝 Log de Operações</Text>
        <View style={styles.logsContainer}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logItem}>
              {log}
            </Text>
          ))}
        </View>
        <View style={styles.logsButtons}>
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={() => setLogs(['Sistema reiniciado'])}
          >
            <Text style={styles.buttonText}>Limpar Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={checkServerStatus}
          >
            <Text style={styles.buttonText}>Verificar Servidor</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // Renderizar tela de cadastro
  const renderCadastroScreen = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {modoEdicao ? '✏️ Editar Aluno' : '➕ Cadastrar Aluno'}
        </Text>
        
        {/* Nome */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nome do Aluno *</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome completo"
            value={nome}
            onChangeText={setNome}
          />
        </View>

        {/* CEP */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>CEP *</Text>
          <View style={styles.cepContainer}>
            <TextInput
              style={[styles.input, styles.cepInput]}
              placeholder="00000000"
              value={cep}
              onChangeText={setCep}
              keyboardType="numeric"
              maxLength={8}
            />
            {buscandoCEP && <ActivityIndicator size="small" color="#2196F3" />}
          </View>
        </View>

        {/* Endereço */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Logradouro</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={endereco.logradouro}
            editable={false}
          />
        </View>

        <View style={styles.enderecoRow}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Cidade</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={endereco.cidade}
              editable={false}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Estado</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={endereco.estado}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.enderecoRow}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Bairro</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={endereco.bairro}
              editable={false}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Número *</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              value={endereco.numero}
              onChangeText={(text) => setEndereco(prev => ({ ...prev, numero: text }))}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Complemento</Text>
          <TextInput
            style={styles.input}
            placeholder="Apartamento, casa, etc."
            value={endereco.complemento}
            onChangeText={(text) => setEndereco(prev => ({ ...prev, complemento: text }))}
          />
        </View>

        {/* Cursos */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cursos *</Text>
          <View style={styles.cursosContainer}>
            {CURSOS_DISPONIVEIS.map(curso => (
              <TouchableOpacity
                key={curso}
                style={[
                  styles.cursoButton,
                  cursosSelecionados.includes(curso) && styles.cursoButtonSelected
                ]}
                onPress={() => toggleCurso(curso)}
              >
                <Text style={[
                  styles.cursoButtonText,
                  cursosSelecionados.includes(curso) && styles.cursoButtonTextSelected
                ]}>
                  {curso}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botões */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={salvarAluno}
            disabled={loading || serverStatus !== 'online'}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {modoEdicao ? 'Atualizar' : 'Cadastrar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              if (modoEdicao) {
                fecharModal();
              } else {
                setCurrentScreen('list');
                limparFormulario();
              }
            }}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎓 Sistema de Alunos</Text>
        <Text style={styles.subtitle}>Gestão Acadêmica</Text>
        {renderServerStatus()}
        
        {/* Botões de navegação */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, currentScreen === 'list' && styles.navButtonActive]}
            onPress={() => setCurrentScreen('list')}
          >
            <Text style={[styles.navButtonText, currentScreen === 'list' && styles.navButtonTextActive]}>
              📋 Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, currentScreen === 'cadastro' && styles.navButtonActive]}
            onPress={() => {
              setCurrentScreen('cadastro');
              limparFormulario();
            }}
          >
            <Text style={[styles.navButtonText, currentScreen === 'cadastro' && styles.navButtonTextActive]}>
              ➕ Cadastrar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo */}
      {currentScreen === 'list' ? renderListScreen() : renderCadastroScreen()}

      {/* Modal de visualização */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible && !modoEdicao}
        onRequestClose={fecharModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>👁️ Visualizar Aluno</Text>
            
            {alunoSelecionado && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Nome:</Text>
                  <Text style={styles.modalValue}>{alunoSelecionado.nome}</Text>
                </View>
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Matrícula:</Text>
                  <Text style={styles.modalValue}>{alunoSelecionado.matricula}</Text>
                </View>
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Endereço:</Text>
                  <Text style={styles.modalValue}>
                    {alunoSelecionado.endereco.logradouro}, {alunoSelecionado.endereco.numero}
                    {alunoSelecionado.endereco.complemento && `, ${alunoSelecionado.endereco.complemento}`}
                  </Text>
                  <Text style={styles.modalValue}>
                    {alunoSelecionado.endereco.bairro} - {alunoSelecionado.endereco.cidade}/{alunoSelecionado.endereco.estado}
                  </Text>
                  <Text style={styles.modalValue}>CEP: {alunoSelecionado.endereco.cep}</Text>
                </View>
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Cursos:</Text>
                  <Text style={styles.modalValue}>{alunoSelecionado.cursos.join(', ')}</Text>
                </View>
              </ScrollView>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={fecharModal}
              >
                <Text style={styles.buttonText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => {
                  setModalVisible(false);
                  abrirModal(alunoSelecionado, true);
                }}
              >
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 10,
  },
  serverStatus: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  serverStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navButtonActive: {
    backgroundColor: '#fff',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonTextActive: {
    color: '#2196F3',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  cepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cepInput: {
    flex: 1,
  },
  enderecoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  cursosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cursoButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#fff',
  },
  cursoButtonSelected: {
    backgroundColor: '#2196F3',
  },
  cursoButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  cursoButtonTextSelected: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  alunosSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alunosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  refreshButtonText: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  alunoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  alunoInfo: {
    flex: 1,
    marginRight: 10,
  },
  alunoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  alunoMatricula: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  alunoEndereco: {
    fontSize: 12,
    color: '#888',
    marginBottom: 3,
  },
  alunoCursos: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  alunoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 35,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#17a2b8',
  },
  editButton: {
    backgroundColor: '#ffc107',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    fontSize: 14,
  },
  logsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    maxHeight: 150,
  },
  logItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  logsButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalBody: {
    maxHeight: 400,
  },
  modalInfo: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  modalValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
});