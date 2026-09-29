// Castellano. ES EL TEXTO QUE MANDA: las demás versiones son traducciones
// informativas. Ver lang/reglamento/_estructura.js.
const { CORREOS } = require('./_estructura');

const mail = (dir) => `<a href="mailto:${dir}">${dir}</a>`;

module.exports = {
  code: 'es',
  html_lang: 'es',
  nombre: 'Castellano',

  titulo: 'Reglamento General de Inscripción y Normativa',
  meta_titulo: 'Reglamento General de Inscripción y Normativa | Menorca Rugby Club',
  meta_desc:
    'Reglamento General de Inscripción y Normativa del Menorca Rugby Club. Condiciones de inscripción, cuotas, uso de instalaciones, conducta, derechos de imagen y protección de datos.',

  version_linea: (v, fecha) =>
    `Versión <strong>${v}</strong> · en vigor desde el ${fecha}.`,
  fecha: '28 de septiembre de 2026',
  otros_idiomas: 'Otros idiomas',
  prevalece: null, // el castellano es el original

  intro: `
    <p>
      Este documento es el que se acepta al formalizar la inscripción. Cada alta guarda la
      versión del reglamento que estaba en vigor en ese momento, de modo que siempre puede
      determinarse qué texto aceptó cada persona.
    </p>`,

  aceptacion: {
    t: 'Aceptación de términos y ámbito de aplicación',
    html: `
    <p>
      Al completar el formulario de inscripción y confirmarlo por medios electrónicos,
      la persona socia, voluntaria o deportista —o su madre, padre o representante legal si
      es menor de edad— declara <strong>conocer y aceptar íntegramente</strong> los
      términos y condiciones de este Reglamento. La aceptación se considera plena salvo
      manifestación expresa en contrario.
    </p>
    <p>
      Quien no desee aceptar alguna de estas disposiciones deberá comunicarlo por escrito a
      ${mail(CORREOS.politicas)}, indicando con claridad los puntos que no acepta. Toda
      solicitud de baja debe tramitarse igualmente por medios electrónicos.
    </p>
    <p>
      Este Reglamento es de aplicación a todos los miembros del Club: personas socias,
      voluntarias, deportistas, entrenadores, personal técnico y representantes legales de
      los menores inscritos.
    </p>`,
  },

  inscripcion: {
    t: 'Inscripción y alta',
    html: `
    <p>
      La inscripción se formaliza en <a href="/inscripcion">menorcarugbyclub.com/inscripcion</a>
      y tiene <strong>carácter anual</strong>, referida a la temporada deportiva.
    </p>
    <p>
      El envío del formulario no produce por sí solo el alta: la inscripción queda
      <strong>sujeta a revisión y aprobación por el Club</strong>. Hasta que sea aprobada, la
      persona inscrita no adquiere la condición de miembro ni participa en convocatorias ni en
      la actividad federada.
    </p>
    <p>
      Los datos solicitados son los necesarios para tramitar la licencia federativa, para
      contactar con la familia y para prestar la atención adecuada en caso de incidencia
      durante la actividad. La persona inscrita o su representante legal se compromete a
      mantenerlos actualizados, en particular los teléfonos de contacto y la información
      médica relevante.
    </p>`,
  },

  cuotas: {
    t: 'Cuotas, ficha federativa e importes aplicables',
    html: `
    <p>
      La inscripción comprende <strong>nueve cargos</strong> a lo largo de la temporada. El
      primer cargo incluye la <strong>ficha federativa con seguro deportivo</strong> y, en su
      caso, la cuota de inscripción; los cargos restantes corresponden a las cuotas mensuales.
    </p>
    <p>
      <strong>Los importes no se recogen en este Reglamento.</strong> Las cuantías de la cuota
      de inscripción, de la ficha federativa y de las cuotas mensuales, así como los
      descuentos y bonificaciones aplicables, son las <strong>publicadas en el portal de
      inscripción del Club</strong>, que se muestran de forma expresa a la persona interesada
      antes de completar el proceso y que se consideran parte integrante de este Reglamento por
      referencia.
    </p>
    <p>
      Serán de aplicación los importes <strong>vigentes en la fecha de formalización</strong>
      de cada inscripción. El Club, por acuerdo de su comisión directiva, podrá modificar dichos
      importes para temporadas sucesivas; la modificación no afectará a las cuotas ya devengadas
      ni a los importes aceptados por quienes ya hubieran formalizado su alta en la temporada en
      curso.
    </p>
    <p>
      Determinadas bonificaciones —entre otras, las correspondientes a unidades familiares con
      más de un miembro inscrito, a familiares de miembros de la directiva o del cuerpo técnico,
      a personas colaboradoras y a situaciones de necesidad acreditada—
      <strong>no son seleccionables por la persona interesada</strong>: las aplica el Club al
      revisar la inscripción. Quien considere que le corresponde alguna puede solicitarlo en
      ${mail(CORREOS.tesoreria)}.
    </p>`,
    subs: {
      formas_pago: {
        t: 'Formas de pago',
        html: `
        <p>
          Los pagos se realizan exclusivamente mediante <strong>tarjeta de crédito o
          débito</strong> o <strong>transferencia bancaria</strong>. No se admiten pagos en
          efectivo ni otros medios alternativos. Para emplear un medio distinto del ofrecido en
          el portal debe contactarse previamente con ${mail(CORREOS.tesoreria)}.
        </p>
        <p>
          Al formalizar el alta se facilita una tarjeta que queda registrada y autorizada en la
          pasarela de pago. <strong>En ese momento no se realiza ningún cargo.</strong> El Club
          no accede, trata ni conserva en ningún momento los datos completos de la tarjeta, que
          son custodiados por el proveedor de servicios de pago.
        </p>
        <p>
          Los cargos se inician una vez aprobada la inscripción. El Club podrá aplicar sobre el
          importe mostrado a la persona interesada las bonificaciones que correspondan, pero
          <strong>en ningún caso cargará un importe superior al aceptado</strong> sin recabar una
          nueva autorización expresa.
        </p>`,
      },
      compromiso: {
        t: 'Compromiso anual, bajas y devoluciones',
        html: `
        <p>
          Al formalizar el alta se acepta expresamente el <strong>débito de los nueve
          cargos</strong> correspondientes a la temporada, que permanecen exigibles aunque se
          solicite la baja durante el curso. La planificación deportiva y económica del Club
          —inscripción en competiciones, contratación de personal técnico, material y
          licencias— se sustenta en dicho compromiso.
        </p>
        <p>
          <strong>No se admiten bajas con efectos retroactivos ni devoluciones parciales.</strong>
          Las cuotas ya devengadas y la ficha federativa no son reembolsables, por corresponder a
          periodos ya iniciados y a licencias ya tramitadas ante la federación.
        </p>
        <p>
          Las <strong>situaciones excepcionales debidamente justificadas</strong> —entre otras,
          lesión de larga duración, traslado de residencia o circunstancias sobrevenidas de
          carácter económico o familiar— podrán ser valoradas por la comisión directiva, que
          podrá acordar la suspensión o modificación de los cargos. La solicitud debe dirigirse a
          ${mail(CORREOS.politicas)}.
        </p>
        <p>
          La baja debe comunicarse por medios electrónicos <strong>antes del inicio del siguiente
          ciclo anual</strong> para evitar la renovación automática. El historial deportivo y la
          ficha de la persona se conservan, de modo que un alta posterior no exige volver a
          aportar toda la información.
        </p>`,
      },
    },
  },

  voluntarias: {
    t: 'Personas socias voluntarias y de gimnasio',
    html: `
    <p>
      Quienes deseen colaborar con el Club o hacer uso del gimnasio sin estar federadas pueden
      inscribirse como <strong>socias voluntarias</strong> o <strong>socias de gimnasio</strong>.
      Esta modalidad comprende una matrícula anual y una cuota mensual, cuyos importes son
      igualmente los publicados en el portal conforme al apartado 3.
    </p>
    <p>
      La matrícula da derecho al acceso a las instalaciones en los horarios habilitados. Esta
      modalidad está sujeta al mismo régimen de compromiso anual, no reembolso y baja por medios
      electrónicos previsto en el apartado 3.2.
    </p>`,
  },

  instalaciones: {
    t: 'Normativa de uso de instalaciones y conducta',
    html: `
    <p>
      De aplicación a todos los miembros del Club: personas socias, voluntarias, deportistas y
      representantes legales.
    </p>`,
    subs: {
      acceso: {
        t: 'Acceso a las instalaciones',
        html: `
        <ul>
          <li>Solo dentro del horario autorizado por la directiva.</li>
          <li>Las personas menores de edad deben estar acompañadas por un adulto autorizado.</li>
          <li>Queda prohibida la permanencia fuera de horario o sin autorización.</li>
        </ul>`,
      },
      gimnasio: {
        t: 'Uso del gimnasio',
        html: `
        <ul>
          <li>El acceso es <strong>personal e intransferible</strong>.</li>
          <li>Horario: de 10:30 a 16:00 y de 19:00 a 21:00.</li>
          <li>Durante los entrenamientos tienen prioridad los equipos federados.</li>
        </ul>`,
      },
      acompanantes: {
        t: 'Acompañantes',
        html: `
        <ul>
          <li>
            No se permite la asistencia de acompañantes a entrenamientos o sesiones físicas sin
            autorización expresa de la directiva o del cuerpo técnico.
          </li>
          <li>Sí se permite en partidos y eventos abiertos, conforme a las normas del Club.</li>
        </ul>`,
      },
      llaves: {
        t: 'Llaves y dispositivos de acceso',
        html: `
        <ul>
          <li>Queda prohibida su tenencia o reproducción sin autorización.</li>
          <li>El uso indebido conlleva responsabilidad y las sanciones previstas en el apartado 6.</li>
        </ul>`,
      },
      cuidado: {
        t: 'Cuidado de las instalaciones',
        html: `
        <ul>
          <li>Existe obligación de cuidar las instalaciones, el material y el equipamiento.</li>
          <li>
            Los daños causados podrán dar lugar a la obligación de resarcimiento y a las sanciones
            previstas, con independencia de las responsabilidades civiles o penales que pudieran
            derivarse.
          </li>
        </ul>`,
      },
      conducta: {
        t: 'Conducta',
        html: `
        <p>
          Se exige un comportamiento ejemplar en toda actividad del Club, dentro y fuera de las
          instalaciones, y el respeto hacia compañeros, rivales, árbitros, cuerpo técnico,
          personal y público. El Club no tolera conductas violentas, discriminatorias, de acoso ni
          ninguna forma de menosprecio por razón de sexo, origen, orientación sexual, religión,
          discapacidad o cualquier otra circunstancia personal o social.
        </p>`,
      },
    },
  },

  disciplina: {
    t: 'Régimen disciplinario',
    html: `
    <p>El incumplimiento de este Reglamento podrá dar lugar, en función de su gravedad, a:</p>
    <ul>
      <li>Sanción económica de hasta 1.500 €.</li>
      <li>Suspensión temporal de la condición de miembro.</li>
      <li>Expulsión definitiva del Club.</li>
    </ul>
    <p>
      Las sanciones se acuerdan por la comisión directiva previa audiencia de la persona
      interesada o, si es menor de edad, de su representante legal, y sin perjuicio del régimen
      disciplinario federativo que resulte aplicable.
    </p>`,
  },

  autorizaciones: {
    t: 'Autorizaciones otorgadas al inscribirse',
    html: `
    <p>
      Salvo manifestación expresa en contrario dirigida a ${mail(CORREOS.politicas)}, al
      formalizar la inscripción se entienden otorgadas las siguientes autorizaciones:
    </p>
    <ul>
      <li>Firma digital de la documentación federativa en nombre de la persona inscrita.</li>
      <li>
        Participación en entrenamientos, partidos, concentraciones y desplazamientos organizados
        por el Club.
      </li>
      <li>
        Tratamiento de los datos personales conforme al apartado 9, para la gestión de la
        actividad y las comunicaciones del Club.
      </li>
    </ul>
    <p>
      La <strong>cesión de derechos de imagen se rige por el apartado 8</strong> y requiere
      consentimiento expreso e independiente.
    </p>`,
  },

  imagen: {
    t: 'Derechos de imagen',
    html: `
    <p>
      El Club realiza fotografías y grabaciones en entrenamientos, partidos y actos, y difunde
      parte de ese material con la finalidad de dar cuenta de su actividad deportiva y social.
    </p>
    <p>
      De conformidad con la <strong>Ley Orgánica 1/1982, de 5 de mayo</strong>, de protección
      civil del derecho al honor, a la intimidad personal y familiar y a la propia imagen, y con
      el <strong>Reglamento (UE) 2016/679</strong> (RGPD) y la <strong>Ley Orgánica
      3/2018</strong>, la captación y difusión de la imagen requiere <strong>consentimiento
      expreso</strong>, que se recaba de forma separada en el formulario de inscripción.
    </p>
    <ul>
      <li>
        <strong>Es voluntario.</strong> No prestarlo no impide la práctica deportiva ni supone
        diferencia de trato alguna.
      </li>
      <li>
        <strong>Menores de edad.</strong> El consentimiento lo otorga quien ostente la patria
        potestad o tutela. A partir de los catorce años se recabará además, cuando resulte
        posible, la conformidad de la persona menor.
      </li>
      <li>
        <strong>Alcance.</strong> La autorización comprende la reproducción, distribución y
        comunicación pública de imágenes tomadas en la actividad del Club, en su web, sus
        perfiles en redes sociales, sus publicaciones y sus notas de prensa, con ámbito
        territorial no limitado por la propia naturaleza de internet y por el tiempo que se
        mantenga la difusión.
      </li>
      <li>
        <strong>Carácter gratuito.</strong> La cesión no conlleva contraprestación económica ni
        derecho a remuneración de ningún tipo.
      </li>
      <li>
        <strong>Límites.</strong> No se difundirán imágenes con fines comerciales ajenos al Club,
        ni se cederán a terceros con esa finalidad, ni se publicarán asociadas a datos personales
        como el domicilio, el teléfono o información médica. Se evitará la difusión de imágenes
        que puedan resultar denigrantes o lesivas para la dignidad de la persona.
      </li>
      <li>
        <strong>Revocación.</strong> El consentimiento puede retirarse en cualquier momento, sin
        efecto retroactivo sobre los tratamientos ya realizados, escribiendo a
        ${mail(CORREOS.politicas)}. El Club cesará en nuevas difusiones y retirará el material
        publicado en los medios bajo su control, sin que pueda garantizar la retirada de material
        ya impreso o redifundido por terceros.
      </li>
    </ul>
    <p>
      En partidos y actos abiertos al público pueden captar imágenes medios de comunicación u
      otros asistentes, sobre cuya actividad el Club no tiene control ni responsabilidad.
    </p>`,
  },

  datos: {
    t: 'Protección de datos personales',
    html: `
    <p>
      Conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018, de 5 de diciembre,
      de Protección de Datos Personales y garantía de los derechos digitales:
    </p>
    <ul>
      <li><strong>Responsable del tratamiento:</strong> Menorca Rugby Club — NIF G57441628.</li>
      <li>
        <strong>Finalidades:</strong> gestión deportiva, federativa, administrativa, contable y de
        comunicación de la actividad del Club.
      </li>
      <li>
        <strong>Base jurídica:</strong> la ejecución de la relación asociativa y el cumplimiento
        de obligaciones legales; el consentimiento en el caso de los derechos de imagen y de las
        comunicaciones no necesarias para dicha relación.
      </li>
      <li>
        <strong>Destinatarios:</strong> la federación deportiva correspondiente para la
        tramitación de licencias y seguros, las administraciones públicas cuando exista obligación
        legal, y los proveedores de servicios necesarios para la gestión —pasarela de pago,
        alojamiento y correo— en calidad de encargados del tratamiento.
      </li>
      <li>
        <strong>Conservación:</strong> durante la relación con el Club y, después, durante los
        plazos legalmente exigibles.
      </li>
      <li>
        <strong>Derechos:</strong> acceso, rectificación, supresión, oposición, limitación y
        portabilidad, escribiendo a ${mail(CORREOS.datos)}.
      </li>
      <li>
        <strong>Reclamaciones:</strong> ante la Agencia Española de Protección de Datos
        (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).
      </li>
    </ul>
    <p>
      El detalle del tratamiento se recoge en la <a href="/privacidad">política de privacidad</a>.
    </p>`,
  },

  riesgos: {
    t: 'Actividad deportiva, riesgos y seguro',
    html: `
    <p>
      El rugby es un deporte de contacto que comporta riesgo de lesión. La persona inscrita, o su
      representante legal, conoce y asume dicho riesgo inherente a la práctica deportiva.
    </p>
    <p>
      La ficha federativa incluye el <strong>seguro deportivo obligatorio</strong> previsto en la
      normativa aplicable, con la cobertura establecida por la federación correspondiente. Toda
      incidencia debe comunicarse al Club con la mayor brevedad para su tramitación.
    </p>
    <p>
      La persona inscrita declara no padecer enfermedad ni condición que le impida la práctica
      deportiva, y se compromete a comunicar al Club cualquier circunstancia médica relevante.
    </p>`,
  },

  modificacion: {
    t: 'Modificación del Reglamento',
    html: `
    <p>
      El Club puede modificar este Reglamento por acuerdo de su comisión directiva. Cada
      modificación da lugar a una nueva versión identificada, publicada en esta misma dirección.
      Las modificaciones sustanciales se comunicarán a las personas inscritas por correo
      electrónico y surtirán efecto para la temporada siguiente, salvo que vengan impuestas por
      una norma de obligado cumplimiento.
    </p>`,
  },

  contacto: {
    t: 'Consultas y contacto',
    html: `
    <ul>
      <li>Cuestiones generales y directiva: ${mail(CORREOS.general)}</li>
      <li>Pagos, cuotas y bonificaciones: ${mail(CORREOS.tesoreria)}</li>
      <li>
        No aceptación de términos, bajas y revocación de consentimientos: ${mail(CORREOS.politicas)}
      </li>
      <li>Protección de datos: ${mail(CORREOS.datos)}</li>
    </ul>`,
  },

  legislacion: {
    t: 'Legislación aplicable',
    html: `
    <p>
      Este Reglamento se rige por la legislación española. Para cualquier controversia derivada de
      su interpretación o aplicación serán competentes los juzgados y tribunales que correspondan
      conforme a derecho, sin perjuicio del fuero que legalmente corresponda a la persona
      consumidora.
    </p>`,
  },
};
