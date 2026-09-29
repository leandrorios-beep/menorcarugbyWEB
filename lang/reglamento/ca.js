// Català. Traducció informativa: mana el text castellà (§13).
const { CORREOS } = require('./_estructura');

const mail = (dir) => `<a href="mailto:${dir}">${dir}</a>`;

module.exports = {
  code: 'ca',
  html_lang: 'ca',
  nombre: 'Català',

  titulo: 'Reglament General d’Inscripció i Normativa',
  meta_titulo: 'Reglament General d’Inscripció i Normativa | Menorca Rugby Club',
  meta_desc:
    'Reglament General d’Inscripció i Normativa del Menorca Rugby Club. Condicions d’inscripció, quotes, ús de les instal·lacions, conducta, drets d’imatge i protecció de dades.',

  version_linea: (v, fecha) => `Versió <strong>${v}</strong> · en vigor des del ${fecha}.`,
  fecha: '28 de setembre de 2026',
  otros_idiomas: 'Altres idiomes',
  prevalece:
    'Aquesta és una traducció informativa. El Club té el domicili a Espanya i es regeix per la ' +
    'legislació espanyola: en cas de discrepància, preval la <a href="/reglamento">versió ' +
    'castellana</a>, que és el text que s’accepta en formalitzar la inscripció.',

  intro: `
    <p>
      Aquest document és el que s’accepta en formalitzar la inscripció. Cada alta desa la versió
      del reglament que era vigent en aquell moment, de manera que sempre es pot determinar quin
      text va acceptar cada persona.
    </p>`,

  aceptacion: {
    t: 'Acceptació de termes i àmbit d’aplicació',
    html: `
    <p>
      En emplenar el formulari d’inscripció i confirmar-lo per mitjans electrònics, la persona
      sòcia, voluntària o esportista —o la seva mare, pare o representant legal si és menor
      d’edat— declara <strong>conèixer i acceptar íntegrament</strong> els termes i condicions
      d’aquest Reglament. L’acceptació es considera plena llevat de manifestació expressa en
      contra.
    </p>
    <p>
      Qui no vulgui acceptar alguna d’aquestes disposicions ho haurà de comunicar per escrit a
      ${mail(CORREOS.politicas)}, indicant amb claredat els punts que no accepta. Tota sol·licitud
      de baixa s’ha de tramitar igualment per mitjans electrònics.
    </p>
    <p>
      Aquest Reglament s’aplica a tots els membres del Club: persones sòcies, voluntàries,
      esportistes, entrenadors, personal tècnic i representants legals dels menors inscrits.
    </p>`,
  },

  inscripcion: {
    t: 'Inscripció i alta',
    html: `
    <p>
      La inscripció es formalitza a <a href="/inscripcion">menorcarugbyclub.com/inscripcion</a> i
      té <strong>caràcter anual</strong>, referida a la temporada esportiva.
    </p>
    <p>
      L’enviament del formulari no produeix per si sol l’alta: la inscripció queda
      <strong>subjecta a revisió i aprovació pel Club</strong>. Fins que no sigui aprovada, la
      persona inscrita no adquireix la condició de membre ni participa en convocatòries ni en
      l’activitat federada.
    </p>
    <p>
      Les dades sol·licitades són les necessàries per tramitar la llicència federativa, per
      contactar amb la família i per prestar l’atenció adequada en cas d’incidència durant
      l’activitat. La persona inscrita o el seu representant legal es compromet a mantenir-les
      actualitzades, en particular els telèfons de contacte i la informació mèdica rellevant.
    </p>`,
  },

  cuotas: {
    t: 'Quotes, fitxa federativa i imports aplicables',
    html: `
    <p>
      La inscripció comprèn <strong>nou càrrecs</strong> al llarg de la temporada. El primer
      càrrec inclou la <strong>fitxa federativa amb assegurança esportiva</strong> i, si escau, la
      quota d’inscripció; els càrrecs restants corresponen a les quotes mensuals.
    </p>
    <p>
      <strong>Els imports no es recullen en aquest Reglament.</strong> Les quanties de la quota
      d’inscripció, de la fitxa federativa i de les quotes mensuals, així com els descomptes i
      bonificacions aplicables, són les <strong>publicades al portal d’inscripció del
      Club</strong>, que es mostren de manera expressa a la persona interessada abans de completar
      el procés i que es consideren part integrant d’aquest Reglament per referència.
    </p>
    <p>
      S’aplicaran els imports <strong>vigents en la data de formalització</strong> de cada
      inscripció. El Club, per acord de la seva comissió directiva, podrà modificar aquests imports
      per a temporades successives; la modificació no afectarà les quotes ja meritades ni els
      imports acceptats per qui ja hagués formalitzat la seva alta en la temporada en curs.
    </p>
    <p>
      Determinades bonificacions —entre d’altres, les corresponents a unitats familiars amb més
      d’un membre inscrit, a familiars de membres de la directiva o del cos tècnic, a persones
      col·laboradores i a situacions de necessitat acreditada—
      <strong>no són seleccionables per la persona interessada</strong>: les aplica el Club en
      revisar la inscripció. Qui consideri que li correspon alguna pot sol·licitar-ho a
      ${mail(CORREOS.tesoreria)}.
    </p>`,
    subs: {
      formas_pago: {
        t: 'Formes de pagament',
        html: `
        <p>
          Els pagaments es fan exclusivament mitjançant <strong>targeta de crèdit o
          dèbit</strong> o <strong>transferència bancària</strong>. No s’admeten pagaments en
          efectiu ni altres mitjans alternatius. Per emprar un mitjà diferent de l’ofert al portal
          cal contactar prèviament amb ${mail(CORREOS.tesoreria)}.
        </p>
        <p>
          En formalitzar l’alta es facilita una targeta que queda registrada i autoritzada a la
          passarel·la de pagament. <strong>En aquell moment no es fa cap càrrec.</strong> El Club
          no accedeix, tracta ni conserva en cap moment les dades completes de la targeta, que són
          custodiades pel proveïdor de serveis de pagament.
        </p>
        <p>
          Els càrrecs s’inicien un cop aprovada la inscripció. El Club podrà aplicar sobre
          l’import mostrat a la persona interessada les bonificacions que corresponguin, però
          <strong>en cap cas carregarà un import superior a l’acceptat</strong> sense obtenir una
          nova autorització expressa.
        </p>`,
      },
      compromiso: {
        t: 'Compromís anual, baixes i devolucions',
        html: `
        <p>
          En formalitzar l’alta s’accepta expressament el <strong>dèbit dels nou
          càrrecs</strong> corresponents a la temporada, que resten exigibles encara que se
          sol·liciti la baixa durant el curs. La planificació esportiva i econòmica del Club
          —inscripció en competicions, contractació de personal tècnic, material i
          llicències— se sustenta en aquest compromís.
        </p>
        <p>
          <strong>No s’admeten baixes amb efectes retroactius ni devolucions parcials.</strong>
          Les quotes ja meritades i la fitxa federativa no són reemborsables, per correspondre a
          períodes ja iniciats i a llicències ja tramitades davant la federació.
        </p>
        <p>
          Les <strong>situacions excepcionals degudament justificades</strong> —entre d’altres,
          lesió de llarga durada, trasllat de residència o circumstàncies sobrevingudes de
          caràcter econòmic o familiar— podran ser valorades per la comissió directiva, que
          podrà acordar la suspensió o modificació dels càrrecs. La sol·licitud s’ha d’adreçar a
          ${mail(CORREOS.politicas)}.
        </p>
        <p>
          La baixa s’ha de comunicar per mitjans electrònics <strong>abans de l’inici del
          següent cicle anual</strong> per evitar la renovació automàtica. L’historial esportiu i
          la fitxa de la persona es conserven, de manera que una alta posterior no exigeix tornar a
          aportar tota la informació.
        </p>`,
      },
    },
  },

  voluntarias: {
    t: 'Persones sòcies voluntàries i de gimnàs',
    html: `
    <p>
      Qui vulgui col·laborar amb el Club o fer ús del gimnàs sense estar federat pot inscriure’s
      com a <strong>sòcia voluntària</strong> o <strong>sòcia de gimnàs</strong>. Aquesta modalitat
      comprèn una matrícula anual i una quota mensual, els imports de les quals són igualment els
      publicats al portal conforme a l’apartat 3.
    </p>
    <p>
      La matrícula dona dret a l’accés a les instal·lacions en els horaris habilitats. Aquesta
      modalitat està subjecta al mateix règim de compromís anual, no reemborsament i baixa per
      mitjans electrònics previst a l’apartat 3.2.
    </p>`,
  },

  instalaciones: {
    t: 'Normativa d’ús de les instal·lacions i conducta',
    html: `
    <p>
      D’aplicació a tots els membres del Club: persones sòcies, voluntàries, esportistes i
      representants legals.
    </p>`,
    subs: {
      acceso: {
        t: 'Accés a les instal·lacions',
        html: `
        <ul>
          <li>Només dins l’horari autoritzat per la directiva.</li>
          <li>Les persones menors d’edat han d’anar acompanyades per un adult autoritzat.</li>
          <li>Queda prohibida la permanència fora d’horari o sense autorització.</li>
        </ul>`,
      },
      gimnasio: {
        t: 'Ús del gimnàs',
        html: `
        <ul>
          <li>L’accés és <strong>personal i intransferible</strong>.</li>
          <li>Horari: de 10:30 a 16:00 i de 19:00 a 21:00.</li>
          <li>Durant els entrenaments tenen prioritat els equips federats.</li>
        </ul>`,
      },
      acompanantes: {
        t: 'Acompanyants',
        html: `
        <ul>
          <li>
            No es permet l’assistència d’acompanyants a entrenaments o sessions físiques sense
            autorització expressa de la directiva o del cos tècnic.
          </li>
          <li>Sí que es permet en partits i esdeveniments oberts, conforme a les normes del Club.</li>
        </ul>`,
      },
      llaves: {
        t: 'Claus i dispositius d’accés',
        html: `
        <ul>
          <li>Queda prohibida la seva tinença o reproducció sense autorització.</li>
          <li>L’ús indegut comporta responsabilitat i les sancions previstes a l’apartat 6.</li>
        </ul>`,
      },
      cuidado: {
        t: 'Cura de les instal·lacions',
        html: `
        <ul>
          <li>Hi ha obligació de tenir cura de les instal·lacions, el material i l’equipament.</li>
          <li>
            Els danys causats podran donar lloc a l’obligació de rescabalament i a les sancions
            previstes, amb independència de les responsabilitats civils o penals que se’n puguin
            derivar.
          </li>
        </ul>`,
      },
      conducta: {
        t: 'Conducta',
        html: `
        <p>
          S’exigeix un comportament exemplar en tota activitat del Club, dins i fora de les
          instal·lacions, i el respecte envers companys, rivals, àrbitres, cos tècnic, personal i
          públic. El Club no tolera conductes violentes, discriminatòries, d’assetjament ni cap
          forma de menyspreu per raó de sexe, origen, orientació sexual, religió, discapacitat o
          qualsevol altra circumstància personal o social.
        </p>`,
      },
    },
  },

  disciplina: {
    t: 'Règim disciplinari',
    html: `
    <p>L’incompliment d’aquest Reglament podrà donar lloc, en funció de la seva gravetat, a:</p>
    <ul>
      <li>Sanció econòmica de fins a 1.500 €.</li>
      <li>Suspensió temporal de la condició de membre.</li>
      <li>Expulsió definitiva del Club.</li>
    </ul>
    <p>
      Les sancions les acorda la comissió directiva amb audiència prèvia de la persona interessada
      o, si és menor d’edat, del seu representant legal, i sens perjudici del règim disciplinari
      federatiu que resulti aplicable.
    </p>`,
  },

  autorizaciones: {
    t: 'Autoritzacions atorgades en inscriure’s',
    html: `
    <p>
      Llevat de manifestació expressa en contra adreçada a ${mail(CORREOS.politicas)}, en
      formalitzar la inscripció s’entenen atorgades les autoritzacions següents:
    </p>
    <ul>
      <li>Signatura digital de la documentació federativa en nom de la persona inscrita.</li>
      <li>
        Participació en entrenaments, partits, concentracions i desplaçaments organitzats pel Club.
      </li>
      <li>
        Tractament de les dades personals conforme a l’apartat 9, per a la gestió de l’activitat i
        les comunicacions del Club.
      </li>
    </ul>
    <p>
      La <strong>cessió de drets d’imatge es regeix per l’apartat 8</strong> i requereix
      consentiment exprés i independent.
    </p>`,
  },

  imagen: {
    t: 'Drets d’imatge',
    html: `
    <p>
      El Club fa fotografies i enregistraments en entrenaments, partits i actes, i difon part
      d’aquest material amb la finalitat de donar compte de la seva activitat esportiva i social.
    </p>
    <p>
      De conformitat amb la <strong>Llei Orgànica 1/1982, de 5 de maig</strong>, de protecció civil
      del dret a l’honor, a la intimitat personal i familiar i a la pròpia imatge, i amb el
      <strong>Reglament (UE) 2016/679</strong> (RGPD) i la <strong>Llei Orgànica 3/2018</strong>,
      la captació i difusió de la imatge requereix <strong>consentiment exprés</strong>, que es
      recull de manera separada al formulari d’inscripció.
    </p>
    <ul>
      <li>
        <strong>És voluntari.</strong> No prestar-lo no impedeix la pràctica esportiva ni suposa
        cap diferència de tracte.
      </li>
      <li>
        <strong>Menors d’edat.</strong> El consentiment l’atorga qui tingui la pàtria potestat o
        tutela. A partir dels catorze anys es recollirà a més, quan sigui possible, la conformitat
        de la persona menor.
      </li>
      <li>
        <strong>Abast.</strong> L’autorització comprèn la reproducció, distribució i comunicació
        pública d’imatges preses en l’activitat del Club, al seu web, als seus perfils a xarxes
        socials, a les seves publicacions i a les seves notes de premsa, amb àmbit territorial no
        limitat per la mateixa naturalesa d’internet i pel temps que es mantingui la difusió.
      </li>
      <li>
        <strong>Caràcter gratuït.</strong> La cessió no comporta contraprestació econòmica ni dret
        a remuneració de cap tipus.
      </li>
      <li>
        <strong>Límits.</strong> No es difondran imatges amb finalitats comercials alienes al Club,
        ni se cediran a tercers amb aquesta finalitat, ni es publicaran associades a dades
        personals com el domicili, el telèfon o informació mèdica. S’evitarà la difusió d’imatges
        que puguin resultar denigrants o lesives per a la dignitat de la persona.
      </li>
      <li>
        <strong>Revocació.</strong> El consentiment es pot retirar en qualsevol moment, sense efecte
        retroactiu sobre els tractaments ja realitzats, escrivint a ${mail(CORREOS.politicas)}. El
        Club cessarà en noves difusions i retirarà el material publicat als mitjans sota el seu
        control, sense que pugui garantir la retirada de material ja imprès o redifós per tercers.
      </li>
    </ul>
    <p>
      En partits i actes oberts al públic poden captar imatges mitjans de comunicació o altres
      assistents, sobre l’activitat dels quals el Club no té control ni responsabilitat.
    </p>`,
  },

  datos: {
    t: 'Protecció de dades personals',
    html: `
    <p>
      Conforme al Reglament (UE) 2016/679 (RGPD) i a la Llei Orgànica 3/2018, de 5 de desembre, de
      Protecció de Dades Personals i garantia dels drets digitals:
    </p>
    <ul>
      <li><strong>Responsable del tractament:</strong> Menorca Rugby Club — NIF G57441628.</li>
      <li>
        <strong>Finalitats:</strong> gestió esportiva, federativa, administrativa, comptable i de
        comunicació de l’activitat del Club.
      </li>
      <li>
        <strong>Base jurídica:</strong> l’execució de la relació associativa i el compliment
        d’obligacions legals; el consentiment en el cas dels drets d’imatge i de les comunicacions
        no necessàries per a aquesta relació.
      </li>
      <li>
        <strong>Destinataris:</strong> la federació esportiva corresponent per a la tramitació de
        llicències i assegurances, les administracions públiques quan hi hagi obligació legal, i els
        proveïdors de serveis necessaris per a la gestió —passarel·la de pagament, allotjament i
        correu— en qualitat d’encarregats del tractament.
      </li>
      <li>
        <strong>Conservació:</strong> durant la relació amb el Club i, després, durant els terminis
        legalment exigibles.
      </li>
      <li>
        <strong>Drets:</strong> accés, rectificació, supressió, oposició, limitació i portabilitat,
        escrivint a ${mail(CORREOS.datos)}.
      </li>
      <li>
        <strong>Reclamacions:</strong> davant l’Agència Espanyola de Protecció de Dades
        (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).
      </li>
    </ul>
    <p>
      El detall del tractament es recull a la <a href="/privacidad">política de privacitat</a>.
    </p>`,
  },

  riesgos: {
    t: 'Activitat esportiva, riscos i assegurança',
    html: `
    <p>
      El rugbi és un esport de contacte que comporta risc de lesió. La persona inscrita, o el seu
      representant legal, coneix i assumeix aquest risc inherent a la pràctica esportiva.
    </p>
    <p>
      La fitxa federativa inclou l’<strong>assegurança esportiva obligatòria</strong> prevista a la
      normativa aplicable, amb la cobertura establerta per la federació corresponent. Tota
      incidència s’ha de comunicar al Club amb la màxima brevetat per a la seva tramitació.
    </p>
    <p>
      La persona inscrita declara no patir cap malaltia ni condició que li impedeixi la pràctica
      esportiva, i es compromet a comunicar al Club qualsevol circumstància mèdica rellevant.
    </p>`,
  },

  modificacion: {
    t: 'Modificació del Reglament',
    html: `
    <p>
      El Club pot modificar aquest Reglament per acord de la seva comissió directiva. Cada
      modificació dona lloc a una nova versió identificada, publicada en aquesta mateixa adreça.
      Les modificacions substancials es comunicaran a les persones inscrites per correu electrònic
      i tindran efecte per a la temporada següent, llevat que vinguin imposades per una norma de
      compliment obligat.
    </p>`,
  },

  contacto: {
    t: 'Consultes i contacte',
    html: `
    <ul>
      <li>Qüestions generals i directiva: ${mail(CORREOS.general)}</li>
      <li>Pagaments, quotes i bonificacions: ${mail(CORREOS.tesoreria)}</li>
      <li>
        No acceptació de termes, baixes i revocació de consentiments: ${mail(CORREOS.politicas)}
      </li>
      <li>Protecció de dades: ${mail(CORREOS.datos)}</li>
    </ul>`,
  },

  legislacion: {
    t: 'Legislació aplicable',
    html: `
    <p>
      Aquest Reglament es regeix per la legislació espanyola i s’interpreta conforme a la
      <a href="/reglamento">versió castellana</a>, que és el text que s’accepta en formalitzar la
      inscripció. Per a qualsevol controvèrsia derivada de la seva interpretació o aplicació seran
      competents els jutjats i tribunals que corresponguin conforme a dret, sens perjudici del fur
      que legalment correspongui a la persona consumidora.
    </p>`,
  },
};
