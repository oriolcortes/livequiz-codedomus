# LiveQuiz by CodeDomus

LiveQuiz es una aplicación web para crear y jugar quizzes en directo en clase. Está pensada para un uso sencillo: el profesor crea una sala, carga un quiz desde un archivo JSON y los alumnos entran con un código y un nickname.

El proyecto prioriza una arquitectura ligera y de coste controlado. Las preguntas se cargan localmente en el navegador del profesor y la sincronización en tiempo real se hace con Supabase Realtime Broadcast.

## Características

- Salas temporales para quizzes en directo.
- Acceso de profesor con autenticación mediante Supabase.
- Entrada de alumnos sin cuenta, usando código de sala y nickname.
- Editor visual para crear y exportar quizzes en JSON.
- Importación de quizzes desde archivos JSON.
- Sincronización de preguntas, respuestas y ranking en tiempo real.
- Límites por rol y límites globales para controlar el uso.
- Persistencia mínima: se guardan metadatos de salas y perfiles, no el contenido de los quizzes ni los resultados finales.

## Stack

- Next.js 16 con App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase Auth
- Supabase Realtime Broadcast
- Zod para validación de JSON
- pnpm

## Estructura del proyecto

```txt
app/                    Rutas de Next.js App Router
components/             Componentes de UI, auth, dashboard, juego y editor
src/actions/            Server Actions
src/config/limits.ts    Límites por rol y límites globales
src/lib/quiz/           Esquema y utilidades de quizzes
src/lib/realtime/       Contrato de eventos realtime
src/lib/supabase/       Clientes Supabase para browser, server y middleware
supabase/schema.sql     Esquema SQL, RLS, triggers y policies
```

## Funcionamiento

1. El profesor inicia sesión.
2. Crea una sala desde el dashboard.
3. Carga un quiz en formato JSON desde su navegador.
4. Los alumnos entran con el código de sala.
5. El profesor inicia cada pregunta manualmente.
6. Supabase Broadcast sincroniza preguntas, respuestas y ranking.
7. Al finalizar, la sala se marca como terminada.

## Formato del quiz

Los quizzes se definen como JSON:

```json
{
  "title": "HTML básico",
  "description": "Quiz de ejemplo",
  "questions": [
    {
      "id": "q1",
      "text": "¿Qué etiqueta crea un enlace?",
      "options": ["<div>", "<a>", "<img>", "<span>"],
      "correct": 1,
      "time": 20
    }
  ]
}
```

Campos:

- `title`: título del quiz.
- `description`: descripción opcional.
- `questions`: lista de preguntas.
- `text`: enunciado de la pregunta.
- `options`: opciones de respuesta, entre 2 y 6.
- `correct`: índice de la respuesta correcta, empezando en 0.
- `time`: tiempo disponible en segundos, entre 5 y 120.

## Desarrollo local

Instala las dependencias:

```bash
pnpm install
```

Crea el archivo de entorno:

```bash
cp .env.example .env.local
```

Configura las variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Arranca el servidor de desarrollo:

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Configuración de Supabase

1. Crea un proyecto en Supabase.
2. Abre el SQL Editor.
3. Ejecuta el contenido de `supabase/schema.sql`.
4. Copia la URL del proyecto y la publishable key en `.env.local`.
5. En Authentication, configura la URL del sitio y las URLs de redirección.

Para desarrollo local:

```txt
Site URL:
http://localhost:3000

Redirect URL:
http://localhost:3000/auth/callback
```

Para producción, añade también la URL pública del despliegue:

```txt
https://tu-dominio.com/auth/callback
```

## Proveedores de autenticación

La aplicación está preparada para usar proveedores OAuth configurados en Supabase, como Google o Azure/Microsoft.

En cada proveedor debes configurar como redirect URI el callback que indica Supabase, normalmente con este formato:

```txt
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Después, añade el Client ID y el Client Secret en el panel del proveedor correspondiente dentro de Supabase Authentication.

## Roles y límites

Los límites se definen en `src/config/limits.ts`.

Hay tres roles previstos:

- `free`: uso básico.
- `trusted`: uso ampliado.
- `owner`: uso administrativo o propio.

Ejemplo para asignar roles desde Supabase SQL Editor:

```sql
update public.profiles
set role = 'owner'
where email = 'tu-email@example.com';

update public.profiles
set role = 'trusted'
where email in ('persona@example.com');
```

## Scripts disponibles

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm check
```

`pnpm check` ejecuta lint y comprobación de tipos.

## Despliegue

El proyecto puede desplegarse en Vercel como una aplicación Next.js estándar.

Variables necesarias en producción:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

Después del despliegue, recuerda añadir la URL pública a la configuración de autenticación de Supabase.

## Privacidad y persistencia

LiveQuiz evita guardar más información de la necesaria:

- Los quizzes se cargan desde archivos locales.
- El contenido del quiz no se guarda en la base de datos.
- Las respuestas y resultados finales no se persisten.
- La base de datos guarda perfiles, salas y metadatos necesarios para aplicar límites.

## Limitaciones

- La lógica realtime se apoya en Supabase Broadcast.
- La seguridad antitrampa es básica y está pensada para dinámicas de aula, no para exámenes oficiales.
- Los límites internos ayudan a controlar uso y costes, pero no sustituyen la revisión de cuotas del proveedor.
- El ranking vive durante la sesión y no está pensado como registro histórico.

## Estado del proyecto

Proyecto personal en desarrollo. La base funcional está orientada a aulas pequeñas o medianas, con una arquitectura deliberadamente sencilla para poder iterar rápido y mantener el coste bajo.
