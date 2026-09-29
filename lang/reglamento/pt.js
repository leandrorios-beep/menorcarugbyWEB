// Português. Tradução informativa: prevalece o texto espanhol (§13).
const { CORREOS } = require('./_estructura');

const mail = (dir) => `<a href="mailto:${dir}">${dir}</a>`;

module.exports = {
  code: 'pt',
  html_lang: 'pt',
  nombre: 'Português',

  titulo: 'Regulamento Geral de Inscrição e Normas',
  meta_titulo: 'Regulamento Geral de Inscrição e Normas | Menorca Rugby Club',
  meta_desc:
    'Regulamento Geral de Inscrição do Menorca Rugby Club: condições de inscrição, quotas, utilização das instalações, conduta, direitos de imagem e proteção de dados.',

  version_linea: (v, fecha) => `Versão <strong>${v}</strong> · em vigor desde ${fecha}.`,
  fecha: '28 de setembro de 2026',
  otros_idiomas: 'Outros idiomas',
  prevalece:
    'Esta é uma tradução informativa. O Clube tem sede em Espanha e rege-se pela legislação ' +
    'espanhola: em caso de divergência, prevalece a <a href="/reglamento">versão espanhola</a>, ' +
    'que é o texto aceite no momento da inscrição.',

  intro: `
    <p>
      Este é o documento que se aceita ao formalizar a inscrição. Cada inscrição guarda a versão do
      regulamento que estava em vigor nesse momento, pelo que é sempre possível determinar que
      texto cada pessoa aceitou.
    </p>`,

  aceptacion: {
    t: 'Aceitação de termos e âmbito de aplicação',
    html: `
    <p>
      Ao preencher o formulário de inscrição e confirmá-lo por meios eletrónicos, o sócio, o
      voluntário ou o atleta —ou a sua mãe, pai ou representante legal se for menor de idade—
      declara <strong>conhecer e aceitar integralmente</strong> os termos e condições do presente
      Regulamento. A aceitação considera-se plena salvo manifestação expressa em contrário.
    </p>
    <p>
      Quem não pretenda aceitar alguma destas disposições deverá comunicá-lo por escrito para
      ${mail(CORREOS.politicas)}, indicando com clareza os pontos que não aceita. Todo o pedido de
      cessação deve ser igualmente tratado por meios eletrónicos.
    </p>
    <p>
      O presente Regulamento aplica-se a todos os membros do Clube: sócios, voluntários, atletas,
      treinadores, pessoal técnico e representantes legais dos menores inscritos.
    </p>`,
  },

  inscripcion: {
    t: 'Inscrição e admissão',
    html: `
    <p>
      A inscrição formaliza-se em <a href="/inscripcion">menorcarugbyclub.com/inscripcion</a> e tem
      <strong>caráter anual</strong>, referida à época desportiva.
    </p>
    <p>
      O envio do formulário não produz por si só a admissão: a inscrição fica
      <strong>sujeita a revisão e aprovação pelo Clube</strong>. Até ser aprovada, a pessoa inscrita
      não adquire a qualidade de membro nem participa em convocatórias nem na atividade federada.
    </p>
    <p>
      Os dados solicitados são os necessários para tratar a licença federativa, para contactar a
      família e para prestar o acompanhamento adequado em caso de incidente durante a atividade. A
      pessoa inscrita ou o seu representante legal compromete-se a mantê-los atualizados, em
      particular os telefones de contacto e a informação médica relevante.
    </p>`,
  },

  cuotas: {
    t: 'Quotas, licença federativa e montantes aplicáveis',
    html: `
    <p>
      A inscrição compreende <strong>nove débitos</strong> ao longo da época. O primeiro inclui a
      <strong>licença federativa com seguro desportivo</strong> e, se aplicável, a quota de
      inscrição; os restantes correspondem às quotas mensais.
    </p>
    <p>
      <strong>Os montantes não constam do presente Regulamento.</strong> Os valores da quota de
      inscrição, da licença federativa e das quotas mensais, bem como os descontos e bonificações
      aplicáveis, são os <strong>publicados no portal de inscrição do Clube</strong>, que são
      apresentados de forma expressa ao interessado antes de concluir o processo e que se consideram
      parte integrante do presente Regulamento por remissão.
    </p>
    <p>
      Aplicam-se os montantes <strong>em vigor na data de formalização</strong> de cada inscrição. O
      Clube, por deliberação da sua direção, poderá alterar esses montantes para épocas seguintes; a
      alteração não afetará as quotas já vencidas nem os montantes aceites por quem já tenha
      formalizado a sua inscrição na época em curso.
    </p>
    <p>
      Determinadas bonificações —entre outras, as correspondentes a agregados familiares com mais de
      um membro inscrito, a familiares de membros da direção ou da equipa técnica, a colaboradores e
      a situações de necessidade comprovada— <strong>não são selecionáveis pelo
      interessado</strong>: são aplicadas pelo Clube ao rever a inscrição. Quem considere ter
      direito a alguma pode solicitá-la em ${mail(CORREOS.tesoreria)}.
    </p>`,
    subs: {
      formas_pago: {
        t: 'Formas de pagamento',
        html: `
        <p>
          Os pagamentos são efetuados exclusivamente por <strong>cartão de crédito ou de
          débito</strong> ou <strong>transferência bancária</strong>. Não são aceites pagamentos em
          numerário nem outros meios alternativos. Para utilizar um meio diferente do oferecido no
          portal deve contactar-se previamente ${mail(CORREOS.tesoreria)}.
        </p>
        <p>
          Ao formalizar a inscrição é fornecido um cartão que fica registado e autorizado no gateway
          de pagamento. <strong>Nesse momento não é efetuado qualquer débito.</strong> O Clube não
          acede, não trata nem conserva em momento algum os dados completos do cartão, que são
          guardados pelo prestador de serviços de pagamento.
        </p>
        <p>
          Os débitos iniciam-se depois de aprovada a inscrição. O Clube poderá aplicar sobre o
          montante apresentado ao interessado as bonificações que correspondam, mas
          <strong>em caso algum debitará um montante superior ao aceite</strong> sem obter nova
          autorização expressa.
        </p>`,
      },
      compromiso: {
        t: 'Compromisso anual, cessações e reembolsos',
        html: `
        <p>
          Ao formalizar a inscrição aceita-se expressamente o <strong>débito dos nove
          montantes</strong> correspondentes à época, que se mantêm exigíveis ainda que se solicite
          a cessação durante o ano. O planeamento desportivo e económico do Clube —inscrição em
          competições, contratação de equipa técnica, material e licenças— assenta nesse
          compromisso.
        </p>
        <p>
          <strong>Não são aceites cessações com efeitos retroativos nem reembolsos
          parciais.</strong> As quotas já vencidas e a licença federativa não são reembolsáveis, por
          corresponderem a períodos já iniciados e a licenças já tratadas junto da federação.
        </p>
        <p>
          As <strong>situações excecionais devidamente justificadas</strong> —entre outras, lesão de
          longa duração, mudança de residência ou circunstâncias supervenientes de caráter económico
          ou familiar— poderão ser apreciadas pela direção, que poderá decidir a suspensão ou
          alteração dos débitos. O pedido deve ser dirigido a ${mail(CORREOS.politicas)}.
        </p>
        <p>
          A cessação deve ser comunicada por meios eletrónicos <strong>antes do início do ciclo
          anual seguinte</strong> para evitar a renovação automática. O historial desportivo e a
          ficha da pessoa são conservados, pelo que uma inscrição posterior não exige voltar a
          fornecer toda a informação.
        </p>`,
      },
    },
  },

  voluntarias: {
    t: 'Sócios voluntários e sócios de ginásio',
    html: `
    <p>
      Quem pretenda colaborar com o Clube ou utilizar o ginásio sem estar federado pode inscrever-se
      como <strong>sócio voluntário</strong> ou <strong>sócio de ginásio</strong>. Esta modalidade
      compreende uma inscrição anual e uma quota mensal, cujos montantes são igualmente os
      publicados no portal nos termos do artigo 3.
    </p>
    <p>
      A inscrição dá direito ao acesso às instalações nos horários previstos. Esta modalidade está
      sujeita ao mesmo regime de compromisso anual, não reembolso e cessação por meios eletrónicos
      previsto no artigo 3.2.
    </p>`,
  },

  instalaciones: {
    t: 'Normas de utilização das instalações e conduta',
    html: `
    <p>
      Aplicáveis a todos os membros do Clube: sócios, voluntários, atletas e representantes legais.
    </p>`,
    subs: {
      acceso: {
        t: 'Acesso às instalações',
        html: `
        <ul>
          <li>Apenas dentro do horário autorizado pela direção.</li>
          <li>Os menores de idade devem estar acompanhados por um adulto autorizado.</li>
          <li>É proibida a permanência fora de horário ou sem autorização.</li>
        </ul>`,
      },
      gimnasio: {
        t: 'Utilização do ginásio',
        html: `
        <ul>
          <li>O acesso é <strong>pessoal e intransmissível</strong>.</li>
          <li>Horário: das 10:30 às 16:00 e das 19:00 às 21:00.</li>
          <li>Durante os treinos têm prioridade as equipas federadas.</li>
        </ul>`,
      },
      acompanantes: {
        t: 'Acompanhantes',
        html: `
        <ul>
          <li>
            Não é permitida a presença de acompanhantes em treinos ou sessões físicas sem
            autorização expressa da direção ou da equipa técnica.
          </li>
          <li>É permitida em jogos e eventos abertos, nos termos das regras do Clube.</li>
        </ul>`,
      },
      llaves: {
        t: 'Chaves e dispositivos de acesso',
        html: `
        <ul>
          <li>É proibida a sua posse ou reprodução sem autorização.</li>
          <li>A utilização indevida implica responsabilidade e as sanções previstas no artigo 6.</li>
        </ul>`,
      },
      cuidado: {
        t: 'Conservação das instalações',
        html: `
        <ul>
          <li>Existe a obrigação de cuidar das instalações, do material e do equipamento.</li>
          <li>
            Os danos causados poderão dar lugar à obrigação de indemnizar e às sanções previstas,
            independentemente das responsabilidades civis ou penais que daí possam resultar.
          </li>
        </ul>`,
      },
      conducta: {
        t: 'Conduta',
        html: `
        <p>
          Exige-se um comportamento exemplar em toda a atividade do Clube, dentro e fora das
          instalações, e o respeito para com companheiros, adversários, árbitros, equipa técnica,
          pessoal e público. O Clube não tolera condutas violentas, discriminatórias, de assédio nem
          qualquer forma de menosprezo em razão do sexo, origem, orientação sexual, religião,
          deficiência ou qualquer outra circunstância pessoal ou social.
        </p>`,
      },
    },
  },

  disciplina: {
    t: 'Regime disciplinar',
    html: `
    <p>O incumprimento do presente Regulamento poderá dar lugar, em função da sua gravidade, a:</p>
    <ul>
      <li>Sanção pecuniária até 1.500 €.</li>
      <li>Suspensão temporária da qualidade de membro.</li>
      <li>Expulsão definitiva do Clube.</li>
    </ul>
    <p>
      As sanções são deliberadas pela direção após audição do interessado ou, se for menor de idade,
      do seu representante legal, e sem prejuízo do regime disciplinar federativo aplicável.
    </p>`,
  },

  autorizaciones: {
    t: 'Autorizações concedidas ao inscrever-se',
    html: `
    <p>
      Salvo manifestação expressa em contrário dirigida a ${mail(CORREOS.politicas)}, ao formalizar
      a inscrição consideram-se concedidas as seguintes autorizações:
    </p>
    <ul>
      <li>Assinatura digital da documentação federativa em nome da pessoa inscrita.</li>
      <li>Participação em treinos, jogos, estágios e deslocações organizados pelo Clube.</li>
      <li>
        Tratamento dos dados pessoais nos termos do artigo 9, para a gestão da atividade e das
        comunicações do Clube.
      </li>
    </ul>
    <p>
      A <strong>cedência de direitos de imagem rege-se pelo artigo 8</strong> e exige consentimento
      expresso e autónomo.
    </p>`,
  },

  imagen: {
    t: 'Direitos de imagem',
    html: `
    <p>
      O Clube realiza fotografias e gravações em treinos, jogos e eventos, e divulga parte desse
      material com a finalidade de dar conta da sua atividade desportiva e social.
    </p>
    <p>
      Em conformidade com a <strong>Lei Orgânica 1/1982, de 5 de maio</strong>, de proteção civil do
      direito à honra, à intimidade pessoal e familiar e à própria imagem, e com o
      <strong>Regulamento (UE) 2016/679</strong> (RGPD) e a <strong>Lei Orgânica 3/2018</strong>, a
      captação e divulgação da imagem exigem <strong>consentimento expresso</strong>, recolhido de
      forma separada no formulário de inscrição.
    </p>
    <ul>
      <li>
        <strong>É voluntário.</strong> Não o prestar não impede a prática desportiva nem implica
        qualquer diferença de tratamento.
      </li>
      <li>
        <strong>Menores de idade.</strong> O consentimento é dado por quem exerça as
        responsabilidades parentais ou a tutela. A partir dos catorze anos será ainda recolhida,
        sempre que possível, a concordância do menor.
      </li>
      <li>
        <strong>Âmbito.</strong> A autorização abrange a reprodução, distribuição e comunicação
        pública de imagens captadas na atividade do Clube, no seu sítio, nos seus perfis de redes
        sociais, nas suas publicações e nos seus comunicados de imprensa, com âmbito territorial não
        limitado pela própria natureza da internet e pelo tempo em que a divulgação se mantenha.
      </li>
      <li>
        <strong>Caráter gratuito.</strong> A cedência não implica contrapartida económica nem
        direito a remuneração de qualquer tipo.
      </li>
      <li>
        <strong>Limites.</strong> Não serão divulgadas imagens com fins comerciais alheios ao Clube,
        nem cedidas a terceiros com essa finalidade, nem publicadas associadas a dados pessoais como
        a morada, o telefone ou informação médica. Será evitada a divulgação de imagens que possam
        ser degradantes ou lesivas da dignidade da pessoa.
      </li>
      <li>
        <strong>Revogação.</strong> O consentimento pode ser retirado a qualquer momento, sem efeito
        retroativo sobre os tratamentos já realizados, escrevendo para ${mail(CORREOS.politicas)}. O
        Clube cessará novas divulgações e retirará o material publicado nos meios sob o seu
        controlo, não podendo garantir a retirada de material já impresso ou redifundido por
        terceiros.
      </li>
    </ul>
    <p>
      Em jogos e eventos abertos ao público podem captar imagens órgãos de comunicação social ou
      outros presentes, sobre cuja atividade o Clube não tem controlo nem responsabilidade.
    </p>`,
  },

  datos: {
    t: 'Proteção de dados pessoais',
    html: `
    <p>
      Nos termos do Regulamento (UE) 2016/679 (RGPD) e da Lei Orgânica 3/2018, de 5 de dezembro, de
      Proteção de Dados Pessoais e garantia dos direitos digitais:
    </p>
    <ul>
      <li><strong>Responsável pelo tratamento:</strong> Menorca Rugby Club — NIF G57441628.</li>
      <li>
        <strong>Finalidades:</strong> gestão desportiva, federativa, administrativa, contabilística
        e de comunicação da atividade do Clube.
      </li>
      <li>
        <strong>Base jurídica:</strong> a execução da relação associativa e o cumprimento de
        obrigações legais; o consentimento no caso dos direitos de imagem e das comunicações não
        necessárias a essa relação.
      </li>
      <li>
        <strong>Destinatários:</strong> a federação desportiva competente para o tratamento de
        licenças e seguros, as administrações públicas quando exista obrigação legal, e os
        prestadores de serviços necessários à gestão —gateway de pagamento, alojamento e correio
        eletrónico— na qualidade de subcontratantes.
      </li>
      <li>
        <strong>Conservação:</strong> durante a relação com o Clube e, depois, durante os prazos
        legalmente exigíveis.
      </li>
      <li>
        <strong>Direitos:</strong> acesso, retificação, apagamento, oposição, limitação e
        portabilidade, escrevendo para ${mail(CORREOS.datos)}.
      </li>
      <li>
        <strong>Reclamações:</strong> junto da Agência Espanhola de Proteção de Dados
        (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).
      </li>
    </ul>
    <p>
      O detalhe do tratamento consta da
      <a href="/privacidad">política de privacidade</a>.
    </p>`,
  },

  riesgos: {
    t: 'Atividade desportiva, riscos e seguro',
    html: `
    <p>
      O râguebi é um desporto de contacto que comporta risco de lesão. A pessoa inscrita, ou o seu
      representante legal, conhece e assume esse risco inerente à prática desportiva.
    </p>
    <p>
      A licença federativa inclui o <strong>seguro desportivo obrigatório</strong> previsto na
      normativa aplicável, com a cobertura estabelecida pela federação competente. Todo o incidente
      deve ser comunicado ao Clube com a maior brevidade para o respetivo tratamento.
    </p>
    <p>
      A pessoa inscrita declara não padecer de doença nem condição que a impeça de praticar
      desporto, e compromete-se a comunicar ao Clube qualquer circunstância médica relevante.
    </p>`,
  },

  modificacion: {
    t: 'Alteração do Regulamento',
    html: `
    <p>
      O Clube pode alterar o presente Regulamento por deliberação da sua direção. Cada alteração dá
      lugar a uma nova versão identificada, publicada nesta mesma morada. As alterações substanciais
      serão comunicadas às pessoas inscritas por correio eletrónico e produzirão efeitos para a
      época seguinte, salvo se forem impostas por norma de cumprimento obrigatório.
    </p>`,
  },

  contacto: {
    t: 'Questões e contacto',
    html: `
    <ul>
      <li>Questões gerais e direção: ${mail(CORREOS.general)}</li>
      <li>Pagamentos, quotas e bonificações: ${mail(CORREOS.tesoreria)}</li>
      <li>
        Não aceitação de termos, cessações e revogação de consentimentos: ${mail(CORREOS.politicas)}
      </li>
      <li>Proteção de dados: ${mail(CORREOS.datos)}</li>
    </ul>`,
  },

  legislacion: {
    t: 'Legislação aplicável',
    html: `
    <p>
      O presente Regulamento rege-se pela legislação espanhola e interpreta-se em conformidade com a
      <a href="/reglamento">versão espanhola</a>, que é o texto aceite no momento da inscrição. Para
      qualquer litígio decorrente da sua interpretação ou aplicação serão competentes os tribunais
      que corresponderem nos termos da lei, sem prejuízo do foro que legalmente caiba ao consumidor.
    </p>`,
  },
};
