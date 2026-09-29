// Français. Traduction informative : le texte espagnol prévaut (§13).
const { CORREOS } = require('./_estructura');

const mail = (dir) => `<a href="mailto:${dir}">${dir}</a>`;

module.exports = {
  code: 'fr',
  html_lang: 'fr',
  nombre: 'Français',

  titulo: 'Règlement général d’inscription et règles du Club',
  meta_titulo: 'Règlement général d’inscription et règles du Club | Menorca Rugby Club',
  meta_desc:
    'Règlement général d’inscription du Menorca Rugby Club : conditions d’inscription, cotisations, usage des installations, conduite, droit à l’image et protection des données.',

  version_linea: (v, fecha) => `Version <strong>${v}</strong> · en vigueur depuis le ${fecha}.`,
  fecha: '28 septembre 2026',
  otros_idiomas: 'Autres langues',
  prevalece:
    'Ceci est une traduction à titre informatif. Le Club est domicilié en Espagne et régi par le ' +
    'droit espagnol : en cas de divergence, la <a href="/reglamento">version espagnole</a> ' +
    'prévaut, car c’est le texte accepté lors de l’inscription.',

  intro: `
    <p>
      Ce document est celui qui est accepté lors de l’inscription. Chaque inscription conserve la
      version du règlement en vigueur à ce moment-là, de sorte qu’il est toujours possible de
      déterminer quel texte chaque personne a accepté.
    </p>`,

  aceptacion: {
    t: 'Acceptation des conditions et champ d’application',
    html: `
    <p>
      En remplissant le formulaire d’inscription et en le confirmant par voie électronique, le
      membre, le bénévole ou le sportif —ou sa mère, son père ou son représentant légal s’il est
      mineur— déclare <strong>connaître et accepter intégralement</strong> les conditions du présent
      Règlement. L’acceptation est réputée pleine et entière, sauf déclaration expresse contraire.
    </p>
    <p>
      Toute personne ne souhaitant pas accepter l’une de ces dispositions doit le communiquer par
      écrit à ${mail(CORREOS.politicas)}, en indiquant clairement les points qu’elle n’accepte pas.
      Toute demande de radiation doit également être traitée par voie électronique.
    </p>
    <p>
      Le présent Règlement s’applique à tous les membres du Club : membres, bénévoles, sportifs,
      entraîneurs, personnel technique et représentants légaux des mineurs inscrits.
    </p>`,
  },

  inscripcion: {
    t: 'Inscription et admission',
    html: `
    <p>
      L’inscription s’effectue sur <a href="/inscripcion">menorcarugbyclub.com/inscripcion</a> et
      revêt un <strong>caractère annuel</strong>, pour la saison sportive.
    </p>
    <p>
      L’envoi du formulaire ne vaut pas à lui seul admission : l’inscription est
      <strong>soumise à l’examen et à l’approbation du Club</strong>. Tant qu’elle n’est pas
      approuvée, la personne inscrite n’acquiert pas la qualité de membre et ne participe ni aux
      sélections ni à l’activité fédérale.
    </p>
    <p>
      Les données demandées sont celles nécessaires au traitement de la licence fédérale, au contact
      avec la famille et à une prise en charge adaptée en cas d’incident pendant l’activité. La
      personne inscrite ou son représentant légal s’engage à les tenir à jour, en particulier les
      numéros de téléphone et les informations médicales pertinentes.
    </p>`,
  },

  cuotas: {
    t: 'Cotisations, licence fédérale et montants applicables',
    html: `
    <p>
      L’inscription comprend <strong>neuf prélèvements</strong> au cours de la saison. Le premier
      inclut la <strong>licence fédérale avec assurance sportive</strong> et, le cas échéant, les
      frais d’inscription ; les autres correspondent aux cotisations mensuelles.
    </p>
    <p>
      <strong>Les montants ne figurent pas dans le présent Règlement.</strong> Les montants des
      frais d’inscription, de la licence fédérale et des cotisations mensuelles, ainsi que les
      remises et réductions applicables, sont ceux <strong>publiés sur le portail d’inscription du
      Club</strong>. Ils sont présentés expressément à la personne concernée avant la finalisation
      du processus et sont réputés faire partie intégrante du présent Règlement par renvoi.
    </p>
    <p>
      Les montants <strong>en vigueur à la date de finalisation</strong> de chaque inscription
      s’appliquent. Le Club, sur décision de son comité directeur, pourra modifier ces montants pour
      les saisons suivantes ; la modification n’affectera ni les cotisations déjà exigibles ni les
      montants acceptés par ceux qui ont déjà finalisé leur inscription pour la saison en cours.
    </p>
    <p>
      Certaines réductions —notamment celles applicables aux foyers comptant plus d’un membre
      inscrit, aux proches des membres du comité directeur ou de l’encadrement technique, aux
      personnes collaboratrices et aux situations de besoin avéré—
      <strong>ne peuvent pas être choisies par la personne concernée</strong> : elles sont
      appliquées par le Club lors de l’examen de l’inscription. Toute personne s’estimant
      concernée peut en faire la demande à ${mail(CORREOS.tesoreria)}.
    </p>`,
    subs: {
      formas_pago: {
        t: 'Moyens de paiement',
        html: `
        <p>
          Les paiements s’effectuent exclusivement par <strong>carte de crédit ou de
          débit</strong> ou par <strong>virement bancaire</strong>. Les espèces et autres moyens
          alternatifs ne sont pas acceptés. Pour utiliser un moyen autre que ceux proposés sur le
          portail, il convient de contacter au préalable ${mail(CORREOS.tesoreria)}.
        </p>
        <p>
          Lors de l’inscription, une carte est fournie et se trouve enregistrée et autorisée auprès
          de la plateforme de paiement. <strong>Aucun prélèvement n’est effectué à ce
          moment-là.</strong> Le Club n’accède, ne traite ni ne conserve à aucun moment les données
          complètes de la carte, conservées par le prestataire de services de paiement.
        </p>
        <p>
          Les prélèvements débutent une fois l’inscription approuvée. Le Club pourra appliquer au
          montant présenté à la personne concernée les réductions correspondantes, mais
          <strong>ne prélèvera en aucun cas un montant supérieur à celui accepté</strong> sans
          obtenir une nouvelle autorisation expresse.
        </p>`,
      },
      compromiso: {
        t: 'Engagement annuel, radiations et remboursements',
        html: `
        <p>
          Lors de l’inscription, le <strong>prélèvement des neuf échéances</strong> de la saison est
          expressément accepté ; elles restent exigibles même en cas de demande de radiation en
          cours d’année. La planification sportive et financière du Club —engagements en
          compétition, recrutement de l’encadrement technique, matériel et licences— repose sur cet
          engagement.
        </p>
        <p>
          <strong>Aucune radiation rétroactive ni aucun remboursement partiel n’est
          accepté.</strong> Les cotisations déjà exigibles et la licence fédérale ne sont pas
          remboursables, car elles correspondent à des périodes déjà entamées et à des licences
          déjà traitées auprès de la fédération.
        </p>
        <p>
          Les <strong>situations exceptionnelles dûment justifiées</strong> —notamment blessure de
          longue durée, déménagement ou circonstances économiques ou familiales survenues— pourront
          être examinées par le comité directeur, qui pourra décider de suspendre ou de modifier les
          prélèvements. La demande doit être adressée à ${mail(CORREOS.politicas)}.
        </p>
        <p>
          La radiation doit être communiquée par voie électronique <strong>avant le début du cycle
          annuel suivant</strong> afin d’éviter le renouvellement automatique. L’historique sportif
          et le dossier de la personne sont conservés, de sorte qu’une inscription ultérieure
          n’exige pas de fournir à nouveau toutes les informations.
        </p>`,
      },
    },
  },

  voluntarias: {
    t: 'Membres bénévoles et membres de la salle de sport',
    html: `
    <p>
      Les personnes souhaitant collaborer avec le Club ou utiliser la salle de sport sans être
      licenciées peuvent s’inscrire comme <strong>membres bénévoles</strong> ou
      <strong>membres de la salle</strong>. Cette formule comprend des frais d’adhésion annuels et
      une cotisation mensuelle, dont les montants sont également ceux publiés sur le portail
      conformément à l’article 3.
    </p>
    <p>
      L’adhésion donne droit à l’accès aux installations aux horaires prévus. Cette formule est
      soumise au même régime d’engagement annuel, de non-remboursement et de radiation par voie
      électronique prévu à l’article 3.2.
    </p>`,
  },

  instalaciones: {
    t: 'Règles d’usage des installations et de conduite',
    html: `
    <p>
      Applicables à tous les membres du Club : membres, bénévoles, sportifs et représentants légaux.
    </p>`,
    subs: {
      acceso: {
        t: 'Accès aux installations',
        html: `
        <ul>
          <li>Uniquement pendant les horaires autorisés par le comité directeur.</li>
          <li>Les mineurs doivent être accompagnés d’un adulte autorisé.</li>
          <li>Il est interdit de rester sur place en dehors des horaires ou sans autorisation.</li>
        </ul>`,
      },
      gimnasio: {
        t: 'Usage de la salle de sport',
        html: `
        <ul>
          <li>L’accès est <strong>personnel et incessible</strong>.</li>
          <li>Horaires : de 10h30 à 16h00 et de 19h00 à 21h00.</li>
          <li>Pendant les entraînements, les équipes licenciées sont prioritaires.</li>
        </ul>`,
      },
      acompanantes: {
        t: 'Accompagnants',
        html: `
        <ul>
          <li>
            La présence d’accompagnants aux entraînements ou aux séances physiques n’est pas
            autorisée sans accord exprès du comité directeur ou de l’encadrement technique.
          </li>
          <li>Elle est autorisée lors des matchs et des événements ouverts, selon les règles du Club.</li>
        </ul>`,
      },
      llaves: {
        t: 'Clés et dispositifs d’accès',
        html: `
        <ul>
          <li>Leur détention ou reproduction sans autorisation est interdite.</li>
          <li>Un usage abusif engage la responsabilité et entraîne les sanctions prévues à l’article 6.</li>
        </ul>`,
      },
      cuidado: {
        t: 'Entretien des installations',
        html: `
        <ul>
          <li>Chacun est tenu de prendre soin des installations, du matériel et de l’équipement.</li>
          <li>
            Les dommages causés peuvent donner lieu à une obligation de réparation et aux sanctions
            prévues, sans préjudice des responsabilités civiles ou pénales qui pourraient en
            découler.
          </li>
        </ul>`,
      },
      conducta: {
        t: 'Conduite',
        html: `
        <p>
          Un comportement exemplaire est exigé dans toute activité du Club, dans et hors des
          installations, ainsi que le respect envers les coéquipiers, les adversaires, les arbitres,
          l’encadrement technique, le personnel et le public. Le Club ne tolère ni les comportements
          violents, discriminatoires ou de harcèlement, ni aucune forme de mépris fondée sur le
          sexe, l’origine, l’orientation sexuelle, la religion, le handicap ou toute autre
          circonstance personnelle ou sociale.
        </p>`,
      },
    },
  },

  disciplina: {
    t: 'Régime disciplinaire',
    html: `
    <p>Le non-respect du présent Règlement peut donner lieu, selon sa gravité, à :</p>
    <ul>
      <li>Une sanction financière pouvant aller jusqu’à 1 500 €.</li>
      <li>La suspension temporaire de la qualité de membre.</li>
      <li>L’exclusion définitive du Club.</li>
    </ul>
    <p>
      Les sanctions sont décidées par le comité directeur après audition de la personne concernée
      ou, s’il s’agit d’un mineur, de son représentant légal, et sans préjudice du régime
      disciplinaire fédéral applicable.
    </p>`,
  },

  autorizaciones: {
    t: 'Autorisations accordées lors de l’inscription',
    html: `
    <p>
      Sauf déclaration expresse contraire adressée à ${mail(CORREOS.politicas)}, les autorisations
      suivantes sont réputées accordées lors de l’inscription :
    </p>
    <ul>
      <li>Signature numérique des documents fédéraux au nom de la personne inscrite.</li>
      <li>
        Participation aux entraînements, matchs, stages et déplacements organisés par le Club.
      </li>
      <li>
        Traitement des données personnelles conformément à l’article 9, pour la gestion de
        l’activité et des communications du Club.
      </li>
    </ul>
    <p>
      La <strong>cession du droit à l’image est régie par l’article 8</strong> et requiert un
      consentement exprès et distinct.
    </p>`,
  },

  imagen: {
    t: 'Droit à l’image',
    html: `
    <p>
      Le Club réalise des photographies et des enregistrements lors des entraînements, des matchs et
      des événements, et diffuse une partie de ce matériel afin de rendre compte de son activité
      sportive et sociale.
    </p>
    <p>
      Conformément à la <strong>loi organique 1/1982 du 5 mai</strong>, relative à la protection
      civile du droit à l’honneur, à l’intimité personnelle et familiale et à l’image, ainsi qu’au
      <strong>règlement (UE) 2016/679</strong> (RGPD) et à la <strong>loi organique 3/2018</strong>,
      la captation et la diffusion de l’image requièrent un <strong>consentement exprès</strong>,
      recueilli séparément dans le formulaire d’inscription.
    </p>
    <ul>
      <li>
        <strong>Il est facultatif.</strong> Ne pas le donner n’empêche pas la pratique sportive et
        n’entraîne aucune différence de traitement.
      </li>
      <li>
        <strong>Mineurs.</strong> Le consentement est donné par le titulaire de l’autorité parentale
        ou de la tutelle. À partir de quatorze ans, l’accord du mineur sera également recueilli
        lorsque cela est possible.
      </li>
      <li>
        <strong>Portée.</strong> L’autorisation couvre la reproduction, la distribution et la
        communication au public d’images prises lors de l’activité du Club, sur son site, ses profils
        de réseaux sociaux, ses publications et ses communiqués de presse, avec une portée
        territoriale non limitée par la nature même d’internet et pour la durée de la diffusion.
      </li>
      <li>
        <strong>Gratuité.</strong> La cession n’entraîne aucune contrepartie financière ni aucun
        droit à rémunération.
      </li>
      <li>
        <strong>Limites.</strong> Aucune image ne sera diffusée à des fins commerciales étrangères au
        Club, ni cédée à des tiers à cette fin, ni publiée en association avec des données
        personnelles telles que l’adresse, le téléphone ou des informations médicales. La diffusion
        d’images susceptibles d’être dégradantes ou de porter atteinte à la dignité de la personne
        sera évitée.
      </li>
      <li>
        <strong>Révocation.</strong> Le consentement peut être retiré à tout moment, sans effet
        rétroactif sur les traitements déjà réalisés, en écrivant à ${mail(CORREOS.politicas)}. Le
        Club cessera toute nouvelle diffusion et retirera le matériel publié sur les supports qu’il
        contrôle, sans pouvoir garantir le retrait de matériel déjà imprimé ou rediffusé par des
        tiers.
      </li>
    </ul>
    <p>
      Lors des matchs et des événements ouverts au public, des médias ou d’autres personnes
      présentes peuvent capter des images ; le Club n’a ni contrôle ni responsabilité sur leur
      activité.
    </p>`,
  },

  datos: {
    t: 'Protection des données personnelles',
    html: `
    <p>
      Conformément au règlement (UE) 2016/679 (RGPD) et à la loi organique 3/2018 du 5 décembre
      relative à la protection des données personnelles et à la garantie des droits numériques :
    </p>
    <ul>
      <li><strong>Responsable du traitement :</strong> Menorca Rugby Club — NIF G57441628.</li>
      <li>
        <strong>Finalités :</strong> gestion sportive, fédérale, administrative, comptable et de
        communication de l’activité du Club.
      </li>
      <li>
        <strong>Base juridique :</strong> l’exécution de la relation associative et le respect
        d’obligations légales ; le consentement pour le droit à l’image et pour les communications
        non nécessaires à cette relation.
      </li>
      <li>
        <strong>Destinataires :</strong> la fédération sportive compétente pour le traitement des
        licences et des assurances, les administrations publiques en cas d’obligation légale, et les
        prestataires de services nécessaires à la gestion —plateforme de paiement, hébergement et
        messagerie— en qualité de sous-traitants.
      </li>
      <li>
        <strong>Conservation :</strong> pendant la durée de la relation avec le Club puis, ensuite,
        pendant les délais légalement exigibles.
      </li>
      <li>
        <strong>Droits :</strong> accès, rectification, effacement, opposition, limitation et
        portabilité, en écrivant à ${mail(CORREOS.datos)}.
      </li>
      <li>
        <strong>Réclamations :</strong> auprès de l’Agence espagnole de protection des données
        (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).
      </li>
    </ul>
    <p>
      Le détail du traitement figure dans la
      <a href="/privacidad">politique de confidentialité</a>.
    </p>`,
  },

  riesgos: {
    t: 'Activité sportive, risques et assurance',
    html: `
    <p>
      Le rugby est un sport de contact comportant un risque de blessure. La personne inscrite, ou
      son représentant légal, connaît et assume ce risque inhérent à la pratique sportive.
    </p>
    <p>
      La licence fédérale comprend l’<strong>assurance sportive obligatoire</strong> prévue par la
      réglementation applicable, avec la couverture établie par la fédération compétente. Tout
      incident doit être signalé au Club dans les meilleurs délais pour son traitement.
    </p>
    <p>
      La personne inscrite déclare ne souffrir d’aucune maladie ni condition l’empêchant de
      pratiquer ce sport, et s’engage à communiquer au Club toute circonstance médicale pertinente.
    </p>`,
  },

  modificacion: {
    t: 'Modification du Règlement',
    html: `
    <p>
      Le Club peut modifier le présent Règlement par décision de son comité directeur. Chaque
      modification donne lieu à une nouvelle version identifiée, publiée à cette même adresse. Les
      modifications substantielles seront communiquées aux personnes inscrites par courrier
      électronique et prendront effet pour la saison suivante, sauf si elles sont imposées par une
      norme d’application obligatoire.
    </p>`,
  },

  contacto: {
    t: 'Questions et contact',
    html: `
    <ul>
      <li>Questions générales et comité directeur : ${mail(CORREOS.general)}</li>
      <li>Paiements, cotisations et réductions : ${mail(CORREOS.tesoreria)}</li>
      <li>
        Non-acceptation des conditions, radiations et révocation des consentements :
        ${mail(CORREOS.politicas)}
      </li>
      <li>Protection des données : ${mail(CORREOS.datos)}</li>
    </ul>`,
  },

  legislacion: {
    t: 'Droit applicable',
    html: `
    <p>
      Le présent Règlement est régi par le droit espagnol et s’interprète conformément à la
      <a href="/reglamento">version espagnole</a>, qui est le texte accepté lors de l’inscription.
      Tout litige découlant de son interprétation ou de son application relèvera des juridictions
      compétentes selon la loi, sans préjudice du for légalement reconnu au consommateur.
    </p>`,
  },
};
