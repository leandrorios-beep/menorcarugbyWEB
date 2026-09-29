// Italiano. Traduzione informativa: prevale il testo spagnolo (§13).
const { CORREOS } = require('./_estructura');

const mail = (dir) => `<a href="mailto:${dir}">${dir}</a>`;

module.exports = {
  code: 'it',
  html_lang: 'it',
  nombre: 'Italiano',

  titulo: 'Regolamento generale di iscrizione e normativa',
  meta_titulo: 'Regolamento generale di iscrizione e normativa | Menorca Rugby Club',
  meta_desc:
    'Regolamento generale di iscrizione del Menorca Rugby Club: condizioni di iscrizione, quote, uso degli impianti, condotta, diritti di immagine e protezione dei dati.',

  version_linea: (v, fecha) => `Versione <strong>${v}</strong> · in vigore dal ${fecha}.`,
  fecha: '28 settembre 2026',
  otros_idiomas: 'Altre lingue',
  prevalece:
    'Questa è una traduzione a titolo informativo. Il Club ha sede in Spagna ed è soggetto alla ' +
    'legge spagnola: in caso di discrepanza prevale la <a href="/reglamento">versione ' +
    'spagnola</a>, che è il testo accettato al momento dell’iscrizione.',

  intro: `
    <p>
      Questo è il documento che si accetta al momento dell’iscrizione. Ogni iscrizione conserva la
      versione del regolamento in vigore in quel momento, così da poter sempre stabilire quale
      testo ciascuna persona abbia accettato.
    </p>`,

  aceptacion: {
    t: 'Accettazione dei termini e ambito di applicazione',
    html: `
    <p>
      Compilando il modulo di iscrizione e confermandolo per via elettronica, il socio, il
      volontario o l’atleta —o la madre, il padre o il rappresentante legale se minorenne—
      dichiara di <strong>conoscere e accettare integralmente</strong> i termini e le condizioni
      del presente Regolamento. L’accettazione si considera piena salvo dichiarazione espressa
      contraria.
    </p>
    <p>
      Chi non intenda accettare una di queste disposizioni dovrà comunicarlo per iscritto a
      ${mail(CORREOS.politicas)}, indicando con chiarezza i punti che non accetta. Ogni richiesta di
      cancellazione deve essere presentata anch’essa per via elettronica.
    </p>
    <p>
      Il presente Regolamento si applica a tutti i membri del Club: soci, volontari, atleti,
      allenatori, personale tecnico e rappresentanti legali dei minori iscritti.
    </p>`,
  },

  inscripcion: {
    t: 'Iscrizione e ammissione',
    html: `
    <p>
      L’iscrizione si effettua su <a href="/inscripcion">menorcarugbyclub.com/inscripcion</a> e ha
      <strong>carattere annuale</strong>, riferita alla stagione sportiva.
    </p>
    <p>
      L’invio del modulo non comporta di per sé l’ammissione: l’iscrizione è
      <strong>soggetta a esame e approvazione da parte del Club</strong>. Fino all’approvazione, la
      persona iscritta non acquisisce la qualità di membro e non partecipa alle convocazioni né
      all’attività federale.
    </p>
    <p>
      I dati richiesti sono quelli necessari per il rilascio del tesseramento federale, per
      contattare la famiglia e per prestare l’assistenza adeguata in caso di incidente durante
      l’attività. La persona iscritta o il suo rappresentante legale si impegna a mantenerli
      aggiornati, in particolare i recapiti telefonici e le informazioni mediche rilevanti.
    </p>`,
  },

  cuotas: {
    t: 'Quote, tesseramento federale e importi applicabili',
    html: `
    <p>
      L’iscrizione comprende <strong>nove addebiti</strong> nel corso della stagione. Il primo
      addebito include il <strong>tesseramento federale con assicurazione sportiva</strong> e, se
      del caso, la quota di iscrizione; gli addebiti restanti corrispondono alle quote mensili.
    </p>
    <p>
      <strong>Gli importi non sono indicati nel presente Regolamento.</strong> Gli importi della
      quota di iscrizione, del tesseramento federale e delle quote mensili, nonché gli sconti e le
      agevolazioni applicabili, sono quelli <strong>pubblicati sul portale di iscrizione del
      Club</strong>, che vengono mostrati espressamente all’interessato prima di completare la
      procedura e che si considerano parte integrante del presente Regolamento per rinvio.
    </p>
    <p>
      Si applicano gli importi <strong>vigenti alla data di perfezionamento</strong> di ciascuna
      iscrizione. Il Club, con delibera del proprio consiglio direttivo, potrà modificare tali
      importi per le stagioni successive; la modifica non inciderà sulle quote già maturate né sugli
      importi accettati da chi abbia già perfezionato l’iscrizione per la stagione in corso.
    </p>
    <p>
      Determinate agevolazioni —tra le altre, quelle per nuclei familiari con più di un membro
      iscritto, per familiari di membri del direttivo o dello staff tecnico, per collaboratori e per
      situazioni di necessità documentata— <strong>non sono selezionabili
      dall’interessato</strong>: le applica il Club in sede di esame dell’iscrizione. Chi ritenga di
      averne diritto può richiederlo a ${mail(CORREOS.tesoreria)}.
    </p>`,
    subs: {
      formas_pago: {
        t: 'Modalità di pagamento',
        html: `
        <p>
          I pagamenti si effettuano esclusivamente con <strong>carta di credito o di
          debito</strong> o <strong>bonifico bancario</strong>. Non sono ammessi pagamenti in
          contanti né altri mezzi alternativi. Per utilizzare un mezzo diverso da quelli offerti sul
          portale occorre contattare preventivamente ${mail(CORREOS.tesoreria)}.
        </p>
        <p>
          Al perfezionamento dell’iscrizione si fornisce una carta che viene registrata e
          autorizzata presso il gateway di pagamento. <strong>In quel momento non viene effettuato
          alcun addebito.</strong> Il Club non accede, non tratta né conserva in alcun momento i
          dati completi della carta, custoditi dal prestatore di servizi di pagamento.
        </p>
        <p>
          Gli addebiti iniziano una volta approvata l’iscrizione. Il Club potrà applicare
          sull’importo mostrato all’interessato le agevolazioni spettanti, ma
          <strong>in nessun caso addebiterà un importo superiore a quello accettato</strong> senza
          ottenere una nuova autorizzazione espressa.
        </p>`,
      },
      compromiso: {
        t: 'Impegno annuale, cancellazioni e rimborsi',
        html: `
        <p>
          Al perfezionamento dell’iscrizione si accetta espressamente l’<strong>addebito dei nove
          importi</strong> relativi alla stagione, che restano esigibili anche qualora si richieda
          la cancellazione in corso d’anno. La programmazione sportiva ed economica del Club
          —iscrizione alle competizioni, ingaggio dello staff tecnico, materiale e tesseramenti— si
          fonda su tale impegno.
        </p>
        <p>
          <strong>Non sono ammesse cancellazioni con effetto retroattivo né rimborsi
          parziali.</strong> Le quote già maturate e il tesseramento federale non sono rimborsabili,
          in quanto corrispondono a periodi già iniziati e a tesseramenti già trasmessi alla
          federazione.
        </p>
        <p>
          Le <strong>situazioni eccezionali debitamente documentate</strong> —tra le altre,
          infortunio di lunga durata, trasferimento di residenza o circostanze sopravvenute di
          carattere economico o familiare— potranno essere valutate dal consiglio direttivo, che
          potrà disporre la sospensione o la modifica degli addebiti. La richiesta va inviata a
          ${mail(CORREOS.politicas)}.
        </p>
        <p>
          La cancellazione deve essere comunicata per via elettronica <strong>prima dell’inizio del
          successivo ciclo annuale</strong> per evitare il rinnovo automatico. Lo storico sportivo e
          la scheda della persona vengono conservati, così che una successiva iscrizione non
          richieda di fornire nuovamente tutte le informazioni.
        </p>`,
      },
    },
  },

  voluntarias: {
    t: 'Soci volontari e soci palestra',
    html: `
    <p>
      Chi desideri collaborare con il Club o utilizzare la palestra senza essere tesserato può
      iscriversi come <strong>socio volontario</strong> o <strong>socio palestra</strong>. Questa
      formula comprende un’iscrizione annuale e una quota mensile, i cui importi sono anch’essi
      quelli pubblicati sul portale ai sensi dell’articolo 3.
    </p>
    <p>
      L’iscrizione dà diritto all’accesso agli impianti negli orari previsti. Questa formula è
      soggetta al medesimo regime di impegno annuale, non rimborso e cancellazione per via
      elettronica previsto all’articolo 3.2.
    </p>`,
  },

  instalaciones: {
    t: 'Normativa d’uso degli impianti e condotta',
    html: `
    <p>
      Applicabile a tutti i membri del Club: soci, volontari, atleti e rappresentanti legali.
    </p>`,
    subs: {
      acceso: {
        t: 'Accesso agli impianti',
        html: `
        <ul>
          <li>Solo negli orari autorizzati dal direttivo.</li>
          <li>I minori devono essere accompagnati da un adulto autorizzato.</li>
          <li>È vietato trattenersi fuori orario o senza autorizzazione.</li>
        </ul>`,
      },
      gimnasio: {
        t: 'Uso della palestra',
        html: `
        <ul>
          <li>L’accesso è <strong>personale e non cedibile</strong>.</li>
          <li>Orario: dalle 10:30 alle 16:00 e dalle 19:00 alle 21:00.</li>
          <li>Durante gli allenamenti hanno priorità le squadre tesserate.</li>
        </ul>`,
      },
      acompanantes: {
        t: 'Accompagnatori',
        html: `
        <ul>
          <li>
            Non è consentita la presenza di accompagnatori agli allenamenti o alle sedute fisiche
            senza autorizzazione espressa del direttivo o dello staff tecnico.
          </li>
          <li>È consentita nelle partite e negli eventi aperti, secondo le regole del Club.</li>
        </ul>`,
      },
      llaves: {
        t: 'Chiavi e dispositivi di accesso',
        html: `
        <ul>
          <li>Ne è vietato il possesso o la riproduzione senza autorizzazione.</li>
          <li>L’uso improprio comporta responsabilità e le sanzioni previste all’articolo 6.</li>
        </ul>`,
      },
      cuidado: {
        t: 'Cura degli impianti',
        html: `
        <ul>
          <li>Sussiste l’obbligo di avere cura degli impianti, del materiale e delle attrezzature.</li>
          <li>
            I danni causati potranno dar luogo all’obbligo di risarcimento e alle sanzioni previste,
            indipendentemente dalle responsabilità civili o penali che ne possano derivare.
          </li>
        </ul>`,
      },
      conducta: {
        t: 'Condotta',
        html: `
        <p>
          Si richiede un comportamento esemplare in ogni attività del Club, dentro e fuori dagli
          impianti, e il rispetto verso compagni, avversari, arbitri, staff tecnico, personale e
          pubblico. Il Club non tollera condotte violente, discriminatorie, di molestia né alcuna
          forma di disprezzo per ragioni di sesso, origine, orientamento sessuale, religione,
          disabilità o qualsiasi altra circostanza personale o sociale.
        </p>`,
      },
    },
  },

  disciplina: {
    t: 'Regime disciplinare',
    html: `
    <p>La violazione del presente Regolamento potrà comportare, in base alla gravità:</p>
    <ul>
      <li>Sanzione economica fino a 1.500 €.</li>
      <li>Sospensione temporanea della qualità di membro.</li>
      <li>Espulsione definitiva dal Club.</li>
    </ul>
    <p>
      Le sanzioni sono deliberate dal consiglio direttivo previa audizione dell’interessato o, se
      minorenne, del suo rappresentante legale, e fatto salvo il regime disciplinare federale
      applicabile.
    </p>`,
  },

  autorizaciones: {
    t: 'Autorizzazioni concesse con l’iscrizione',
    html: `
    <p>
      Salvo dichiarazione espressa contraria indirizzata a ${mail(CORREOS.politicas)}, con il
      perfezionamento dell’iscrizione si intendono concesse le seguenti autorizzazioni:
    </p>
    <ul>
      <li>Firma digitale della documentazione federale per conto della persona iscritta.</li>
      <li>Partecipazione ad allenamenti, partite, raduni e trasferte organizzati dal Club.</li>
      <li>
        Trattamento dei dati personali ai sensi dell’articolo 9, per la gestione dell’attività e
        delle comunicazioni del Club.
      </li>
    </ul>
    <p>
      La <strong>cessione dei diritti di immagine è disciplinata dall’articolo 8</strong> e
      richiede un consenso espresso e distinto.
    </p>`,
  },

  imagen: {
    t: 'Diritti di immagine',
    html: `
    <p>
      Il Club realizza fotografie e riprese durante allenamenti, partite ed eventi, e diffonde parte
      di tale materiale allo scopo di dare conto della propria attività sportiva e sociale.
    </p>
    <p>
      Ai sensi della <strong>Legge Organica 1/1982 del 5 maggio</strong>, sulla protezione civile
      del diritto all’onore, alla riservatezza personale e familiare e alla propria immagine, nonché
      del <strong>Regolamento (UE) 2016/679</strong> (GDPR) e della <strong>Legge Organica
      3/2018</strong>, la ripresa e la diffusione dell’immagine richiedono un <strong>consenso
      espresso</strong>, raccolto separatamente nel modulo di iscrizione.
    </p>
    <ul>
      <li>
        <strong>È facoltativo.</strong> Non prestarlo non impedisce la pratica sportiva né comporta
        alcuna differenza di trattamento.
      </li>
      <li>
        <strong>Minori.</strong> Il consenso è prestato da chi esercita la potestà genitoriale o la
        tutela. Dai quattordici anni sarà inoltre raccolto, ove possibile, l’assenso del minore.
      </li>
      <li>
        <strong>Ambito.</strong> L’autorizzazione comprende la riproduzione, la distribuzione e la
        comunicazione al pubblico di immagini riprese nell’attività del Club, sul suo sito, sui suoi
        profili social, nelle sue pubblicazioni e nei suoi comunicati stampa, con ambito
        territoriale non limitato per la natura stessa di internet e per il tempo in cui la
        diffusione è mantenuta.
      </li>
      <li>
        <strong>Gratuità.</strong> La cessione non comporta alcun corrispettivo economico né diritto
        a remunerazione di alcun tipo.
      </li>
      <li>
        <strong>Limiti.</strong> Non saranno diffuse immagini per finalità commerciali estranee al
        Club, né cedute a terzi a tale scopo, né pubblicate in associazione a dati personali quali
        l’indirizzo, il telefono o informazioni mediche. Sarà evitata la diffusione di immagini che
        possano risultare denigratorie o lesive della dignità della persona.
      </li>
      <li>
        <strong>Revoca.</strong> Il consenso può essere ritirato in qualsiasi momento, senza effetto
        retroattivo sui trattamenti già effettuati, scrivendo a ${mail(CORREOS.politicas)}. Il Club
        cesserà ogni nuova diffusione e ritirerà il materiale pubblicato sui canali sotto il proprio
        controllo, senza poter garantire il ritiro di materiale già stampato o ridiffuso da terzi.
      </li>
    </ul>
    <p>
      In partite ed eventi aperti al pubblico possono riprendere immagini organi di informazione o
      altri presenti, sulla cui attività il Club non ha controllo né responsabilità.
    </p>`,
  },

  datos: {
    t: 'Protezione dei dati personali',
    html: `
    <p>
      Ai sensi del Regolamento (UE) 2016/679 (GDPR) e della Legge Organica 3/2018 del 5 dicembre,
      sulla protezione dei dati personali e la garanzia dei diritti digitali:
    </p>
    <ul>
      <li><strong>Titolare del trattamento:</strong> Menorca Rugby Club — NIF G57441628.</li>
      <li>
        <strong>Finalità:</strong> gestione sportiva, federale, amministrativa, contabile e di
        comunicazione dell’attività del Club.
      </li>
      <li>
        <strong>Base giuridica:</strong> l’esecuzione del rapporto associativo e l’adempimento di
        obblighi di legge; il consenso per i diritti di immagine e per le comunicazioni non
        necessarie a tale rapporto.
      </li>
      <li>
        <strong>Destinatari:</strong> la federazione sportiva competente per il rilascio dei
        tesseramenti e delle assicurazioni, le pubbliche amministrazioni quando sussista un obbligo
        di legge, e i fornitori di servizi necessari alla gestione —gateway di pagamento, hosting e
        posta elettronica— in qualità di responsabili del trattamento.
      </li>
      <li>
        <strong>Conservazione:</strong> per la durata del rapporto con il Club e, successivamente,
        per i termini legalmente previsti.
      </li>
      <li>
        <strong>Diritti:</strong> accesso, rettifica, cancellazione, opposizione, limitazione e
        portabilità, scrivendo a ${mail(CORREOS.datos)}.
      </li>
      <li>
        <strong>Reclami:</strong> all’Agenzia spagnola per la protezione dei dati
        (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).
      </li>
    </ul>
    <p>
      Il dettaglio del trattamento è riportato nell’
      <a href="/privacidad">informativa sulla privacy</a>.
    </p>`,
  },

  riesgos: {
    t: 'Attività sportiva, rischi e assicurazione',
    html: `
    <p>
      Il rugby è uno sport di contatto che comporta rischio di infortunio. La persona iscritta, o il
      suo rappresentante legale, conosce e si assume tale rischio inerente alla pratica sportiva.
    </p>
    <p>
      Il tesseramento federale include l’<strong>assicurazione sportiva obbligatoria</strong>
      prevista dalla normativa applicabile, con la copertura stabilita dalla federazione competente.
      Ogni incidente deve essere comunicato al Club nel più breve tempo possibile per la relativa
      pratica.
    </p>
    <p>
      La persona iscritta dichiara di non soffrire di malattie o condizioni che le impediscano la
      pratica sportiva, e si impegna a comunicare al Club qualsiasi circostanza medica rilevante.
    </p>`,
  },

  modificacion: {
    t: 'Modifica del Regolamento',
    html: `
    <p>
      Il Club può modificare il presente Regolamento con delibera del proprio consiglio direttivo.
      Ogni modifica dà luogo a una nuova versione identificata, pubblicata a questo stesso
      indirizzo. Le modifiche sostanziali saranno comunicate alle persone iscritte via posta
      elettronica e avranno effetto per la stagione successiva, salvo che siano imposte da una norma
      di obbligatorio adempimento.
    </p>`,
  },

  contacto: {
    t: 'Informazioni e contatti',
    html: `
    <ul>
      <li>Questioni generali e direttivo: ${mail(CORREOS.general)}</li>
      <li>Pagamenti, quote e agevolazioni: ${mail(CORREOS.tesoreria)}</li>
      <li>
        Mancata accettazione dei termini, cancellazioni e revoca dei consensi:
        ${mail(CORREOS.politicas)}
      </li>
      <li>Protezione dei dati: ${mail(CORREOS.datos)}</li>
    </ul>`,
  },

  legislacion: {
    t: 'Legge applicabile',
    html: `
    <p>
      Il presente Regolamento è disciplinato dalla legge spagnola e si interpreta conformemente alla
      <a href="/reglamento">versione spagnola</a>, che è il testo accettato al momento
      dell’iscrizione. Per qualsiasi controversia derivante dalla sua interpretazione o applicazione
      saranno competenti i tribunali che risultino tali secondo la legge, fatto salvo il foro
      spettante per legge al consumatore.
    </p>`,
  },
};
