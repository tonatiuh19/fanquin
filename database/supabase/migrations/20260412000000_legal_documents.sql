-- ============================================================
-- Migration: Legal Documents
-- Date: 2026-04-12
--
-- Creates a legal_documents table to store versioned copies of
-- the Privacy Policy and Terms & Conditions so they can be
-- updated via new migrations without touching source code.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text        NOT NULL CHECK (type IN ('privacy', 'terms')),
  version        text        NOT NULL DEFAULT '1.0',
  title          text        NOT NULL,
  content        text        NOT NULL,   -- stored as plain-text / markdown
  jurisdiction   text        NOT NULL DEFAULT 'MX',
  effective_date date        NOT NULL,
  is_active      boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Enforce only one active document per type
CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_active_type_idx
  ON public.legal_documents (type)
  WHERE is_active = true;

-- Public read access (no auth required — legal pages are public)
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_documents_public_read"
  ON public.legal_documents
  FOR SELECT
  USING (true);

-- ── Seed: Privacy Policy v1.0 ────────────────────────────────
INSERT INTO public.legal_documents (type, version, title, effective_date, is_active, content)
VALUES (
  'privacy',
  '1.0',
  'Aviso de Privacidad',
  '2026-04-12',
  true,
$CONTENT$
# Aviso de Privacidad

**Última actualización:** 12 de abril de 2026

FanQuin (en adelante "FanQuin", "nosotros" o "la Plataforma"), con sitio web www.fanquin.com, es responsable del tratamiento de los datos personales que usted nos proporciona, de conformidad con lo establecido en la **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)** y su Reglamento, vigentes en los Estados Unidos Mexicanos.

Para cualquier asunto relacionado con el presente Aviso de Privacidad, puede contactarnos a través del correo electrónico: **privacidad@fanquin.com**

---

## 1. Identidad y domicilio del responsable

FanQuin, con sitio web www.fanquin.com, opera como responsable del tratamiento de datos conforme a la legislación mexicana vigente.

---

## 2. Datos personales que recopilamos

### 2.1 Datos que usted nos proporciona directamente

- Nombre completo o nombre de usuario (alias)
- Correo electrónico (utilizado también para autenticación mediante OTP)
- Fecha de nacimiento (para verificar mayoría de edad)
- País y ciudad de residencia
- Foto de perfil (opcional)
- Información de grupos y quinielas que crea o en los que participa

> **Nota sobre autenticación:** FanQuin NO almacena contraseñas. El acceso a la plataforma se realiza exclusivamente mediante un código de un solo uso (OTP) enviado al correo electrónico registrado. Dicho código es temporal, de uso único y no se conserva en nuestros sistemas una vez utilizado o expirado.

### 2.2 Datos recopilados de forma automática

- Dirección IP y datos de geolocalización aproximada
- Tipo de dispositivo, sistema operativo y navegador
- Páginas visitadas, clics, tiempo de sesión y comportamiento dentro de la Plataforma
- Cookies y tecnologías de rastreo similares (ver Sección 7)

### 2.3 Datos sensibles

FanQuin no recopila datos sensibles (salud, biometría, ideología política, etc.) de manera intencional. Si usted proporciona información de este tipo en su perfil o en grupos, lo hace bajo su exclusiva responsabilidad.

---

## 3. Finalidades del tratamiento de datos

### 3.1 Finalidades primarias (necesarias para el servicio)

- Crear y administrar su cuenta de usuario
- Enviar el código OTP al correo electrónico para autenticación segura
- Permitir la participación en quinielas y ligas de fantasy social
- Gestionar grupos y comunicaciones entre participantes
- Enviar notificaciones del servicio (resultados, alertas, cambios en términos)
- Atender solicitudes de soporte y contacto
- Cumplir obligaciones legales aplicables

### 3.2 Finalidades secundarias (puede oponerse)

- Envío de comunicaciones promocionales, boletines y novedades de FanQuin
- Elaboración de estadísticas y perfiles de uso para mejora de la Plataforma
- Personalización de contenido y sugerencias dentro de la app

Para oponerse a las finalidades secundarias, envíe un correo a privacidad@fanquin.com con el asunto **"Oposición finalidades secundarias"**. La negativa no afectará su acceso al servicio principal.

---

## 4. Transferencia de datos personales

FanQuin podrá transferir sus datos personales en los siguientes supuestos:

- Proveedores de servicios tecnológicos (hosting, base de datos, análisis) que actúan como encargados bajo contrato de confidencialidad
- Proveedores del servicio de envío de correos electrónicos (necesario para la entrega del código OTP de autenticación)
- Proveedores de publicidad de terceros que muestran anuncios dentro de la Plataforma (ver Sección 8)
- Autoridades competentes cuando la ley lo exija

En ningún caso venderemos sus datos personales a terceros con fines comerciales propios.

---

## 5. Derechos ARCO

Usted tiene derecho a **Acceder, Rectificar, Cancelar u Oponerse** (derechos ARCO) al tratamiento de sus datos personales, así como el derecho a la Portabilidad y a revocar su consentimiento, conforme a la LFPDPPP.

**Procedimiento para ejercer derechos ARCO:**

1. Envíe su solicitud a privacidad@fanquin.com con el asunto **"Ejercicio de Derechos ARCO"**
2. Incluya: nombre completo, correo registrado, descripción del derecho que desea ejercer y, en su caso, documentos de respaldo
3. Responderemos en un plazo máximo de **20 días hábiles**
4. La respuesta se enviará al correo electrónico que nos proporcione

**Usuarios en la Unión Europea (GDPR):** Si usted se encuentra en el Espacio Económico Europeo, adicionalmente tiene derecho a presentar una queja ante la autoridad supervisora de protección de datos de su país, y a solicitar la limitación del tratamiento o la supresión definitiva de sus datos ("derecho al olvido"), conforme al Reglamento General de Protección de Datos (GDPR, Reglamento UE 2016/679).

**Usuarios en California, EE.UU. (CCPA):** Si usted reside en California, tiene derecho a conocer qué datos personales recopilamos, a solicitar su eliminación, y a no ser discriminado por ejercer estos derechos, conforme a la California Consumer Privacy Act (CCPA).

---

## 6. Medidas de seguridad

FanQuin implementa medidas técnicas, administrativas y físicas para proteger sus datos personales, incluyendo:

- Cifrado HTTPS/TLS en todas las comunicaciones
- Autenticación sin contraseña mediante OTP de un solo uso con expiración automática, eliminando el riesgo de almacenamiento de credenciales
- Acceso restringido a datos personales por parte del personal autorizado
- Copias de seguridad periódicas en entornos protegidos

No obstante lo anterior, ningún sistema de seguridad es infalible. FanQuin no garantiza la seguridad absoluta de los datos transmitidos a través de Internet.

---

## 7. Uso de cookies y tecnologías similares

FanQuin utiliza cookies propias y de terceros con las siguientes finalidades:

- **Cookies esenciales:** necesarias para el funcionamiento de la Plataforma (sesión, autenticación mediante OTP)
- **Cookies analíticas:** herramientas de medición del uso de la Plataforma
- **Cookies publicitarias:** redes de publicidad de terceros para mostrar anuncios relevantes

Usted puede configurar su navegador para rechazar cookies, aunque esto puede afectar la funcionalidad del sitio.

---

## 8. Publicidad de terceros

FanQuin muestra anuncios de terceros (redes publicitarias externas). FanQuin no es responsable del contenido de dichos anuncios, ni de las prácticas de privacidad de los anunciantes. Los anunciantes pueden utilizar cookies propias para personalizar los anuncios que le muestran. Le recomendamos revisar las políticas de privacidad de los anunciantes cuyos sitios visite desde un anuncio.

---

## 9. Retención de datos

Sus datos personales se conservarán mientras su cuenta esté activa o durante el tiempo necesario para cumplir las finalidades descritas en este Aviso, y en todo caso durante los plazos legales mínimos exigidos por la legislación mexicana aplicable.

Al solicitar la cancelación de su cuenta, procederemos a bloquear y suprimir sus datos, salvo que exista obligación legal de conservarlos.

---

## 10. Menores de edad

El servicio de FanQuin está dirigido exclusivamente a personas **mayores de 18 años**. No recopilamos conscientemente datos de menores de edad. Si usted tiene conocimiento de que un menor ha proporcionado datos en la Plataforma, le pedimos notificarlo a privacidad@fanquin.com para proceder a su eliminación.

---

## 11. Cambios al aviso de privacidad

FanQuin se reserva el derecho de modificar el presente Aviso en cualquier momento. Las modificaciones serán notificadas mediante publicación en www.fanquin.com y/o correo electrónico a los usuarios registrados. El uso continuado de la Plataforma tras la notificación implica la aceptación de los cambios.

---

## 12. Legislación aplicable y jurisdicción

El presente Aviso se rige por la legislación vigente en los **Estados Unidos Mexicanos**, en particular la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento. Para la resolución de controversias, las partes se someten a la jurisdicción de los tribunales competentes del fuero federal de México.

Sin perjuicio de lo anterior, FanQuin reconoce la aplicabilidad del GDPR para usuarios en el Espacio Económico Europeo y de la CCPA para usuarios en el estado de California, EE.UU.

---

*FanQuin — Quinielas y Fantasy Social · www.fanquin.com · Hecho en México para el mundo* 🇲🇽
$CONTENT$
);

-- ── Seed: Terms & Conditions v1.0 ────────────────────────────
INSERT INTO public.legal_documents (type, version, title, effective_date, is_active, content)
VALUES (
  'terms',
  '1.0',
  'Términos y Condiciones de Uso',
  '2026-04-12',
  true,
$CONTENT$
# Términos y Condiciones de Uso

**Última actualización:** 12 de abril de 2026

Al acceder, registrarse o utilizar la plataforma FanQuin (en adelante "la Plataforma", "el Servicio" o "FanQuin"), disponible en www.fanquin.com, usted (en adelante "el Usuario") declara haber leído, comprendido y aceptado íntegramente los presentes Términos y Condiciones de Uso.

Si no está de acuerdo con alguna parte de estos Términos, deberá abstenerse de utilizar la Plataforma.

---

## 1. Aceptación de los términos

Estos Términos constituyen un contrato legalmente vinculante entre usted y FanQuin. El uso continuado de la Plataforma implica la aceptación de cualquier modificación publicada en www.fanquin.com.

---

## 2. Descripción del servicio

FanQuin es una plataforma digital de entretenimiento social que permite a los Usuarios:

- Crear y participar en quinielas deportivas y de otro tipo
- Crear y unirse a ligas de fantasy social ("FanQuin")
- Formar grupos privados o públicos con otros Usuarios
- Compartir predicciones, resultados y estadísticas dentro de la comunidad

FanQuin actúa exclusivamente como **facilitador tecnológico** del entretenimiento social entre Usuarios. La Plataforma no organiza, promueve ni participa en apuestas con dinero real, ni en juegos de azar en los términos de la legislación aplicable.

---

## 3. Requisitos para el uso

### 3.1 Mayoría de edad

El uso de FanQuin está restringido a personas **mayores de 18 años**. Al registrarse, el Usuario declara bajo su responsabilidad que cumple este requisito.

### 3.2 Registro de cuenta y autenticación OTP

Para acceder a FanQuin, el Usuario deberá:

1. Registrar un correo electrónico válido y vigente
2. Solicitar un código de un solo uso (OTP) que será enviado a dicho correo
3. Ingresar el código OTP en la Plataforma para autenticarse

**FanQuin NO utiliza contraseñas.** El correo electrónico registrado es el único medio de autenticación. El Usuario es responsable de:

- Mantener el acceso exclusivo a su cuenta de correo electrónico registrada
- No compartir los códigos OTP recibidos con terceros
- Notificar de inmediato a FanQuin si sospecha que su cuenta ha sido comprometida, escribiendo a soporte@fanquin.com

FanQuin no se hace responsable de accesos no autorizados derivados de que el Usuario haya compartido su correo o sus códigos OTP con terceros.

### 3.3 Una cuenta por persona

Queda prohibida la creación de múltiples cuentas por un mismo Usuario. FanQuin se reserva el derecho de cancelar las cuentas duplicadas que detecte.

---

## 4. Naturaleza del servicio — FanQuin como facilitador

FanQuin es una plataforma tecnológica neutral. En consecuencia:

- FanQuin **NO es parte** de las quinielas, grupos o acuerdos que los Usuarios celebren entre sí.
- FanQuin **NO garantiza** el comportamiento, la solvencia, la honestidad ni la legalidad de las acciones de los Usuarios.
- FanQuin **NO es responsable** de disputas, conflictos, pérdidas económicas o daños de cualquier naturaleza que surjan entre Usuarios.
- Cualquier acuerdo de premiación o transacción entre Usuarios es de su exclusiva responsabilidad.

> Si usted decide acordar premios u obligaciones con otros Usuarios, lo hace bajo su propio riesgo. FanQuin no actúa como árbitro, garante ni mediador en tales acuerdos.

---

## 5. Conducta del usuario

### 5.1 Usos permitidos

El Usuario se compromete a utilizar FanQuin de manera lícita, responsable y conforme a estos Términos, a la legislación aplicable y a las buenas costumbres.

### 5.2 Usos prohibidos

Queda expresamente prohibido:

- Utilizar la Plataforma para actividades ilícitas, incluyendo lavado de dinero, fraude o cualquier actividad contraria a la ley
- Publicar, compartir o transmitir contenido ofensivo, difamatorio, obsceno, violento, racista o que incite al odio
- Acosar, amenazar o intimidar a otros Usuarios
- Hacer uso de bots, scripts o cualquier método automatizado no autorizado
- Intentar acceder sin autorización a sistemas, cuentas o datos de otros Usuarios
- Compartir o usar códigos OTP ajenos para suplantar la identidad de otro Usuario
- Comercializar o revender el acceso a la Plataforma sin autorización escrita de FanQuin
- Publicar información falsa o engañosa

---

## 6. Contenido generado por usuarios

FanQuin permite a los Usuarios publicar contenido (nombres de grupos, comentarios, predicciones, imágenes de perfil, etc.). El Usuario es el único responsable del contenido que publique y garantiza que:

- Tiene los derechos necesarios sobre dicho contenido
- El contenido no infringe derechos de terceros
- El contenido no viola la legislación aplicable

FanQuin se reserva el derecho de eliminar, sin previo aviso, cualquier contenido que a su juicio viole estos Términos o la ley, así como de suspender o cancelar la cuenta del Usuario responsable.

---

## 7. Grupos y comunidades

Los grupos dentro de FanQuin son creados y administrados por los propios Usuarios. FanQuin:

- No controla ni supervisa las reglas internas de cada grupo
- No es responsable de los acuerdos, premios, sanciones o cualquier consecuencia derivada de la participación en un grupo
- No interviene en disputas entre miembros de un grupo

Los administradores de grupos son responsables del contenido y la gestión de sus comunidades. FanQuin actúa únicamente como proveedor del espacio tecnológico.

---

## 8. Publicidad y contenido de terceros

FanQuin puede mostrar publicidad de terceros (redes publicitarias externas) dentro de la Plataforma:

- FanQuin **NO es responsable** del contenido, veracidad, legalidad ni calidad de los anuncios publicados por terceros
- FanQuin **NO avala** los productos, servicios o afirmaciones contenidos en los anuncios
- Cualquier interacción del Usuario con un anuncio es de exclusiva responsabilidad del Usuario

---

## 9. Limitación de responsabilidad

En la máxima medida permitida por la ley aplicable, FanQuin no será responsable por:

- Daños directos, indirectos, incidentales, especiales, consecuentes o punitivos de cualquier naturaleza
- Pérdida de datos, lucro cesante o pérdidas económicas de cualquier tipo
- Conductas de terceros Usuarios dentro o fuera de la Plataforma
- Interrupciones, errores técnicos, fallas de conectividad o indisponibilidad temporal del servicio
- Acceso no autorizado a la cuenta del Usuario derivado de que éste haya comprometido su correo electrónico o compartido sus códigos OTP
- Fallas en la entrega del correo electrónico con el código OTP por causas ajenas a FanQuin

La responsabilidad total máxima de FanQuin frente al Usuario no excederá la cantidad que el Usuario haya pagado a FanQuin en los últimos 12 meses o, si el servicio es gratuito, **$0.00 MXN**.

---

## 10. Disponibilidad del servicio

FanQuin no garantiza la disponibilidad ininterrumpida de la Plataforma. FanQuin hará sus mejores esfuerzos para minimizar las interrupciones, pero no asume responsabilidad alguna por las consecuencias de la no disponibilidad del servicio.

---

## 11. Propiedad intelectual y derechos de terceros

### 11.1 Contenido propio de FanQuin

Todo el contenido desarrollado por FanQuin (logotipos, diseño, código fuente, textos propios, marca "FanQuin") es propiedad de FanQuin o de sus licenciantes. Queda prohibida su reproducción, distribución, modificación o uso comercial sin autorización escrita previa.

### 11.2 Ausencia de derechos sobre ligas, torneos e imágenes de terceros

FanQuin **NO posee, NO ha adquirido y NO reclama** ningún derecho sobre los nombres, logotipos, marcas o identidad visual de ninguna liga deportiva, federación, torneo o competición (incluyendo, de manera enunciativa mas no limitativa: FIFA, UEFA, Liga MX, NFL, NBA, MLB y cualquier otra organización deportiva).

Todas las marcas e imágenes de terceros que puedan aparecer referenciadas en la Plataforma pertenecen exclusivamente a sus respectivos titulares. Su mención en FanQuin tiene únicamente carácter informativo o referencial.

### 11.3 FanQuin como facilitador del juego limpio

FanQuin es una plataforma neutral de entretenimiento social. Su función se limita a facilitar que los Usuarios organicen sus propias quinielas y ligas de fantasy de manera justa y transparente ("fair play"). FanQuin no tiene ningún acuerdo, licencia ni afiliación con ninguna liga, federación, club o entidad deportiva, salvo que se indique expresamente lo contrario.

> Si usted es titular de derechos de propiedad intelectual y considera que algún contenido en la Plataforma infringe dichos derechos, contacte a **legal@fanquin.com**.

---

## 12. Política de cancelación y suspensión de cuentas

FanQuin se reserva el derecho de suspender o cancelar, temporal o definitivamente, la cuenta de cualquier Usuario que:

- Viole los presentes Términos
- Proporcione información falsa durante el registro
- Sea menor de 18 años
- Comparta o use códigos OTP de manera fraudulenta
- Realice conductas que perjudiquen a otros Usuarios, a terceros o a FanQuin

---

## 13. Modificaciones al servicio y a los términos

FanQuin se reserva el derecho de modificar, suspender o descontinuar total o parcialmente el Servicio en cualquier momento. Las actualizaciones a estos Términos serán publicadas en www.fanquin.com. El uso continuado de la Plataforma tras la publicación implica su aceptación.

---

## 14. Legislación aplicable y resolución de controversias

Los presentes Términos se rigen e interpretan conforme a la legislación vigente en los **Estados Unidos Mexicanos**. Para la resolución de cualquier controversia, las partes se someten expresamente a la jurisdicción de los tribunales federales competentes de la **Ciudad de México**.

Si el Usuario se encuentra en la Unión Europea, podrá también acudir a los mecanismos de resolución alternativa de litigios en línea (ODR) conforme al Reglamento (UE) 524/2013.

---

## 15. Indemnización

El Usuario se compromete a indemnizar, defender y mantener indemne a FanQuin frente a cualquier reclamación, daño, costo o gasto que surja del incumplimiento por parte del Usuario de estos Términos o de la ley aplicable.

---

## 16. Disposiciones generales

- Si alguna disposición de estos Términos es declarada nula o inaplicable, las demás disposiciones continuarán en plena vigencia.
- La falta de ejercicio por parte de FanQuin de cualquier derecho no implica renuncia al mismo.
- Estos Términos constituyen el acuerdo completo entre el Usuario y FanQuin.

---

## 17. Contacto

| Canal | Dirección |
|---|---|
| Soporte | soporte@fanquin.com |
| Legal | legal@fanquin.com |
| Privacidad | privacidad@fanquin.com |
| Sitio web | www.fanquin.com |

---

*FanQuin — Quinielas y Fantasy Social · www.fanquin.com · Hecho en México para el mundo* 🇲🇽

*Estos Términos fueron redactados conforme a la legislación mexicana (LFPDPPP, Código de Comercio, Ley Federal de Protección al Consumidor), con referencias a GDPR y CCPA para la protección de usuarios globales.*
$CONTENT$
);
