// English. Informative translation: the Spanish text prevails (§13).
const { CORREOS } = require('./_estructura');

const mail = (dir) => `<a href="mailto:${dir}">${dir}</a>`;

module.exports = {
  code: 'en',
  html_lang: 'en',
  nombre: 'English',

  titulo: 'General Registration Rules and Club Regulations',
  meta_titulo: 'General Registration Rules and Club Regulations | Menorca Rugby Club',
  meta_desc:
    'Menorca Rugby Club General Registration Rules and Regulations: registration terms, fees, use of facilities, conduct, image rights and data protection.',

  version_linea: (v, fecha) => `Version <strong>${v}</strong> · in force since ${fecha}.`,
  fecha: '28 September 2026',
  otros_idiomas: 'Other languages',
  prevalece:
    'This is an informative translation. The Club is domiciled in Spain and governed by Spanish ' +
    'law: in the event of any discrepancy, the <a href="/reglamento">Spanish version</a> prevails, ' +
    'as it is the text accepted when completing registration.',

  intro: `
    <p>
      This is the document accepted when completing registration. Every registration stores the
      version of these Regulations in force at that moment, so it is always possible to determine
      which text each person accepted.
    </p>`,

  aceptacion: {
    t: 'Acceptance of terms and scope',
    html: `
    <p>
      By completing the registration form and confirming it electronically, the member, volunteer
      or player —or their mother, father or legal guardian if a minor— declares that they
      <strong>know and fully accept</strong> the terms and conditions of these Regulations.
      Acceptance is deemed complete unless expressly stated otherwise.
    </p>
    <p>
      Anyone who does not wish to accept any of these provisions must state so in writing to
      ${mail(CORREOS.politicas)}, clearly indicating the points they do not accept. Any request to
      withdraw must likewise be submitted electronically.
    </p>
    <p>
      These Regulations apply to all members of the Club: members, volunteers, players, coaches,
      technical staff and the legal guardians of registered minors.
    </p>`,
  },

  inscripcion: {
    t: 'Registration and admission',
    html: `
    <p>
      Registration is completed at <a href="/inscripcion">menorcarugbyclub.com/inscripcion</a> and
      is <strong>annual</strong>, covering the sporting season.
    </p>
    <p>
      Submitting the form does not in itself constitute admission: registration is
      <strong>subject to review and approval by the Club</strong>. Until it is approved, the
      registered person does not acquire membership status and does not take part in team
      selections or in federated activity.
    </p>
    <p>
      The information requested is that required to process the federation licence, to contact the
      family and to provide appropriate care in the event of an incident during activity. The
      registered person or their legal guardian undertakes to keep it up to date, in particular
      contact telephone numbers and relevant medical information.
    </p>`,
  },

  cuotas: {
    t: 'Fees, federation licence and applicable amounts',
    html: `
    <p>
      Registration comprises <strong>nine charges</strong> over the course of the season. The first
      charge includes the <strong>federation licence with sports insurance</strong> and, where
      applicable, the registration fee; the remaining charges correspond to the monthly fees.
    </p>
    <p>
      <strong>Amounts are not set out in these Regulations.</strong> The registration fee, the
      federation licence and the monthly fees, as well as any applicable discounts and reductions,
      are those <strong>published on the Club’s registration portal</strong>. They are shown
      expressly to the person concerned before the process is completed and are considered an
      integral part of these Regulations by reference.
    </p>
    <p>
      The amounts <strong>in force on the date each registration is completed</strong> shall apply.
      The Club, by resolution of its board, may amend those amounts for subsequent seasons; such an
      amendment shall not affect fees already accrued nor amounts accepted by those who have
      already completed their registration for the current season.
    </p>
    <p>
      Certain reductions —among others, those for households with more than one registered member,
      for relatives of board or coaching staff members, for contributors, and for demonstrated
      hardship— <strong>cannot be selected by the person concerned</strong>: they are applied by
      the Club when reviewing the registration. Anyone who believes one applies to them may request
      it at ${mail(CORREOS.tesoreria)}.
    </p>`,
    subs: {
      formas_pago: {
        t: 'Payment methods',
        html: `
        <p>
          Payments are made exclusively by <strong>credit or debit card</strong> or
          <strong>bank transfer</strong>. Cash and other alternative means are not accepted. To use
          a method other than those offered on the portal, please contact
          ${mail(CORREOS.tesoreria)} beforehand.
        </p>
        <p>
          On completing registration a card is provided, which is stored and authorised with the
          payment gateway. <strong>No charge is made at that point.</strong> The Club does not at
          any time access, process or store full card details, which are held by the payment
          services provider.
        </p>
        <p>
          Charges begin once the registration has been approved. The Club may apply any
          corresponding reductions to the amount shown to the person concerned, but
          <strong>shall under no circumstances charge an amount higher than the one accepted</strong>
          without obtaining fresh express authorisation.
        </p>`,
      },
      compromiso: {
        t: 'Annual commitment, withdrawal and refunds',
        html: `
        <p>
          On completing registration, the <strong>debit of the nine charges</strong> for the season
          is expressly accepted; they remain payable even if withdrawal is requested during the
          year. The Club’s sporting and financial planning —competition entries, engagement of
          coaching staff, equipment and licences— rests on that commitment.
        </p>
        <p>
          <strong>Retroactive withdrawals and partial refunds are not accepted.</strong> Fees
          already accrued and the federation licence are non-refundable, as they correspond to
          periods already begun and to licences already processed with the federation.
        </p>
        <p>
          <strong>Duly justified exceptional circumstances</strong> —among others, long-term
          injury, relocation, or unforeseen financial or family circumstances— may be assessed by
          the board, which may agree to suspend or amend the charges. Requests should be addressed
          to ${mail(CORREOS.politicas)}.
        </p>
        <p>
          Withdrawal must be notified electronically <strong>before the start of the next annual
          cycle</strong> to avoid automatic renewal. The person’s sporting history and record are
          retained, so a later registration does not require submitting all the information again.
        </p>`,
      },
    },
  },

  voluntarias: {
    t: 'Volunteer and gym members',
    html: `
    <p>
      Those who wish to support the Club or use the gym without holding a federation licence may
      register as <strong>volunteer members</strong> or <strong>gym members</strong>. This category
      comprises an annual enrolment fee and a monthly fee, the amounts of which are likewise those
      published on the portal in accordance with section 3.
    </p>
    <p>
      Enrolment confers the right to access the facilities during the designated hours. This
      category is subject to the same rules on annual commitment, non-refund and electronic
      withdrawal set out in section 3.2.
    </p>`,
  },

  instalaciones: {
    t: 'Rules on the use of facilities and conduct',
    html: `
    <p>
      Applicable to all members of the Club: members, volunteers, players and legal guardians.
    </p>`,
    subs: {
      acceso: {
        t: 'Access to the facilities',
        html: `
        <ul>
          <li>Only within the hours authorised by the board.</li>
          <li>Minors must be accompanied by an authorised adult.</li>
          <li>Remaining on the premises outside opening hours or without authorisation is prohibited.</li>
        </ul>`,
      },
      gimnasio: {
        t: 'Use of the gym',
        html: `
        <ul>
          <li>Access is <strong>personal and non-transferable</strong>.</li>
          <li>Hours: 10:30 to 16:00 and 19:00 to 21:00.</li>
          <li>Federated teams have priority during training sessions.</li>
        </ul>`,
      },
      acompanantes: {
        t: 'Accompanying persons',
        html: `
        <ul>
          <li>
            Accompanying persons may not attend training or physical sessions without the express
            authorisation of the board or the coaching staff.
          </li>
          <li>They are permitted at matches and open events, in accordance with Club rules.</li>
        </ul>`,
      },
      llaves: {
        t: 'Keys and access devices',
        html: `
        <ul>
          <li>Holding or copying them without authorisation is prohibited.</li>
          <li>Improper use entails liability and the penalties set out in section 6.</li>
        </ul>`,
      },
      cuidado: {
        t: 'Care of the facilities',
        html: `
        <ul>
          <li>There is a duty to take care of the facilities, materials and equipment.</li>
          <li>
            Damage caused may give rise to an obligation to make good and to the penalties set out
            herein, without prejudice to any civil or criminal liability that may arise.
          </li>
        </ul>`,
      },
      conducta: {
        t: 'Conduct',
        html: `
        <p>
          Exemplary behaviour is required in all Club activity, on and off the premises, together
          with respect towards teammates, opponents, referees, coaching staff, employees and the
          public. The Club does not tolerate violent, discriminatory or harassing conduct, nor any
          form of contempt on grounds of sex, origin, sexual orientation, religion, disability or
          any other personal or social circumstance.
        </p>`,
      },
    },
  },

  disciplina: {
    t: 'Disciplinary regime',
    html: `
    <p>Breach of these Regulations may give rise, depending on its seriousness, to:</p>
    <ul>
      <li>A financial penalty of up to €1,500.</li>
      <li>Temporary suspension of membership.</li>
      <li>Permanent expulsion from the Club.</li>
    </ul>
    <p>
      Penalties are decided by the board after hearing the person concerned or, if a minor, their
      legal guardian, and without prejudice to any applicable federation disciplinary regime.
    </p>`,
  },

  autorizaciones: {
    t: 'Authorisations granted on registration',
    html: `
    <p>
      Unless expressly stated otherwise to ${mail(CORREOS.politicas)}, the following authorisations
      are deemed granted on completing registration:
    </p>
    <ul>
      <li>Digital signature of federation paperwork on behalf of the registered person.</li>
      <li>Participation in training, matches, training camps and trips organised by the Club.</li>
      <li>
        Processing of personal data in accordance with section 9, for the management of Club
        activity and communications.
      </li>
    </ul>
    <p>
      The <strong>assignment of image rights is governed by section 8</strong> and requires express,
      separate consent.
    </p>`,
  },

  imagen: {
    t: 'Image rights',
    html: `
    <p>
      The Club takes photographs and recordings at training sessions, matches and events, and
      publishes some of that material in order to report on its sporting and social activity.
    </p>
    <p>
      In accordance with <strong>Organic Law 1/1982 of 5 May</strong>, on the civil protection of
      the right to honour, personal and family privacy and one’s own image, and with
      <strong>Regulation (EU) 2016/679</strong> (GDPR) and <strong>Organic Law 3/2018</strong>,
      capturing and publishing a person’s image requires <strong>express consent</strong>, which is
      obtained separately on the registration form.
    </p>
    <ul>
      <li>
        <strong>It is voluntary.</strong> Withholding it does not prevent participation in sport nor
        entail any difference in treatment.
      </li>
      <li>
        <strong>Minors.</strong> Consent is given by the holder of parental authority or
        guardianship. From the age of fourteen, the minor’s agreement will also be sought where
        possible.
      </li>
      <li>
        <strong>Scope.</strong> The authorisation covers the reproduction, distribution and public
        communication of images taken during Club activity, on its website, its social media
        profiles, its publications and its press releases, with a territorial scope unlimited by the
        very nature of the internet and for as long as publication is maintained.
      </li>
      <li>
        <strong>No consideration.</strong> The assignment carries no financial consideration nor any
        right to remuneration of any kind.
      </li>
      <li>
        <strong>Limits.</strong> Images will not be published for commercial purposes unrelated to
        the Club, nor assigned to third parties for that purpose, nor published alongside personal
        data such as home address, telephone number or medical information. The publication of
        images that may be degrading or harmful to a person’s dignity will be avoided.
      </li>
      <li>
        <strong>Withdrawal.</strong> Consent may be withdrawn at any time, without retroactive
        effect on processing already carried out, by writing to ${mail(CORREOS.politicas)}. The Club
        will cease further publication and remove material published on media under its control,
        but cannot guarantee the removal of material already printed or re-published by third
        parties.
      </li>
    </ul>
    <p>
      At matches and events open to the public, media outlets or other attendees may capture images;
      the Club has no control over or responsibility for their activity.
    </p>`,
  },

  datos: {
    t: 'Protection of personal data',
    html: `
    <p>
      In accordance with Regulation (EU) 2016/679 (GDPR) and Organic Law 3/2018 of 5 December on
      the Protection of Personal Data and guarantee of digital rights:
    </p>
    <ul>
      <li><strong>Data controller:</strong> Menorca Rugby Club — Tax ID G57441628.</li>
      <li>
        <strong>Purposes:</strong> sporting, federation, administrative, accounting and
        communication management of Club activity.
      </li>
      <li>
        <strong>Legal basis:</strong> performance of the membership relationship and compliance with
        legal obligations; consent in the case of image rights and of communications not necessary
        for that relationship.
      </li>
      <li>
        <strong>Recipients:</strong> the relevant sports federation for processing licences and
        insurance, public authorities where there is a legal obligation, and the service providers
        necessary for management —payment gateway, hosting and email— acting as processors.
      </li>
      <li>
        <strong>Retention:</strong> for the duration of the relationship with the Club and,
        thereafter, for the periods legally required.
      </li>
      <li>
        <strong>Rights:</strong> access, rectification, erasure, objection, restriction and
        portability, by writing to ${mail(CORREOS.datos)}.
      </li>
      <li>
        <strong>Complaints:</strong> to the Spanish Data Protection Agency
        (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).
      </li>
    </ul>
    <p>
      Full details of processing are set out in the <a href="/privacidad">privacy policy</a>.
    </p>`,
  },

  riesgos: {
    t: 'Sporting activity, risks and insurance',
    html: `
    <p>
      Rugby is a contact sport that carries a risk of injury. The registered person, or their legal
      guardian, understands and accepts that risk as inherent to playing the sport.
    </p>
    <p>
      The federation licence includes the <strong>compulsory sports insurance</strong> provided for
      in the applicable rules, with the cover established by the relevant federation. Any incident
      must be reported to the Club as soon as possible so that it can be processed.
    </p>
    <p>
      The registered person declares that they have no illness or condition preventing them from
      playing sport, and undertakes to inform the Club of any relevant medical circumstance.
    </p>`,
  },

  modificacion: {
    t: 'Amendment of these Regulations',
    html: `
    <p>
      The Club may amend these Regulations by resolution of its board. Each amendment gives rise to
      a new identified version, published at this same address. Substantial amendments will be
      notified to registered persons by email and will take effect for the following season, unless
      imposed by a mandatory legal provision.
    </p>`,
  },

  contacto: {
    t: 'Enquiries and contact',
    html: `
    <ul>
      <li>General enquiries and the board: ${mail(CORREOS.general)}</li>
      <li>Payments, fees and reductions: ${mail(CORREOS.tesoreria)}</li>
      <li>Non-acceptance of terms, withdrawals and revocation of consent: ${mail(CORREOS.politicas)}</li>
      <li>Data protection: ${mail(CORREOS.datos)}</li>
    </ul>`,
  },

  legislacion: {
    t: 'Governing law',
    html: `
    <p>
      These Regulations are governed by Spanish law and are construed in accordance with the
      <a href="/reglamento">Spanish version</a>, which is the text accepted on completing
      registration. Any dispute arising from their interpretation or application shall fall to the
      courts and tribunals having jurisdiction at law, without prejudice to the forum to which a
      consumer is legally entitled.
    </p>`,
  },
};
