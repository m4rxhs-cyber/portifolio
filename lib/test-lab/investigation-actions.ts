export const investigationActions = {
  pt: {
    reset: 'Reiniciar ambiente', reproduce: 'Consultar API', refresh: 'Atualizar dados', pendingRequest: 'Consultando…', requestError: 'Falha na consulta. Tente novamente.',
    empty: 'Nenhuma evidência disponível. Reproduza o defeito para registrar uma execução.', captured: 'Evidência registrada', copy: 'Copiar evidência', copied: 'Evidência copiada.', copyError: 'Não foi possível copiar a evidência.', date: 'Data e horário', difference: 'Diferença', unit: 'Preço unitário',
    fictitious: 'Use somente dados fictícios. Nenhum cadastro é enviado ou salvo.', confirmation: 'Confirmar senha', accepted: 'Cadastro aceito na demonstração.', registrationErrors: ['Informe o nome.', 'Informe o e-mail.', 'Use pelo menos oito caracteres.', 'Confirme a senha com o mesmo valor.'],
    restore: 'Restaurar exemplo', clear: 'Limpar formulário', discard: 'As alterações deste rascunho serão descartadas.', cancel: 'Cancelar', completed: 'Validação concluída', edited: 'Registro editado. Valide novamente.', pending: 'Critério pendente', met: 'Critério atendido', improve: 'Precisa melhorar',
    levels: ['Insuficiente', 'Precisa melhorar', 'Adequado', 'Bom', 'Excelente'],
    guidance: ['Identifique o contexto e o sintoma específico no título.', 'Informe severidade e prioridade compatíveis com o impacto do cenário.', 'Registre pelo menos três ações em ordem. Inclua os dados de teste e a verificação final.', 'Descreva a regra correta com os dados deste cenário.', 'Informe a falha realmente observada e o valor ou estado divergente.', 'Identifique o navegador ou ambiente web e o módulo do cenário.', 'Reproduza o defeito neste cenário para coletar uma evidência.'],
    positives: 'Pontos positivos', opportunities: 'Oportunidades de melhoria', limits: 'A avaliação verifica padrões e dados do cenário. Revise a clareza e o contexto manualmente.',
    apiLabels: ['Endpoint', 'Método HTTP', 'Status HTTP', 'JSON retornado', 'Dados exibidos na interface', 'Campo divergente'],
  },
  en: {
    reset: 'Reset environment', reproduce: 'Fetch API data', refresh: 'Refresh data', pendingRequest: 'Fetching…', requestError: 'The request failed. Try again.',
    empty: 'No evidence yet. Reproduce the defect to record a run.', captured: 'Evidence recorded', copy: 'Copy evidence', copied: 'Evidence copied.', copyError: 'Could not copy the evidence.', date: 'Date and time', difference: 'Difference', unit: 'Unit price',
    fictitious: 'Use fictional data only. Registration data is never sent or saved.', confirmation: 'Confirm password', accepted: 'Registration accepted in the demo.', registrationErrors: ['Enter a name.', 'Enter an email address.', 'Use at least eight characters.', 'Enter the same password again.'],
    restore: 'Restore example', clear: 'Clear form', discard: 'Changes to this draft will be discarded.', cancel: 'Cancel', completed: 'Validation complete', edited: 'Report edited. Validate it again.', pending: 'Criterion pending', met: 'Criterion met', improve: 'Needs improvement',
    levels: ['Insufficient', 'Needs improvement', 'Adequate', 'Good', 'Excellent'],
    guidance: ['Identify the context and specific symptom in the title.', 'Choose severity and priority that fit the impact of the defect.', 'List at least three actions in order. Include the test data and final check.', 'Describe the correct behavior using the scenario data.', 'Describe the observed failure and the conflicting value or status.', 'Identify the browser or web environment and the affected module.', 'Reproduce this defect to collect evidence for this scenario.'],
    positives: 'Strengths', opportunities: 'Opportunities for improvement', limits: 'The score checks scenario-specific patterns and facts. Review clarity and context manually.',
    apiLabels: ['Endpoint', 'HTTP method', 'HTTP status', 'Returned JSON', 'Data shown in the interface', 'Mismatched field'],
  },
};
export type InvestigationActions = (typeof investigationActions)['en'];
