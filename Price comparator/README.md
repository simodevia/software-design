Price Comparator es una aplicación web para comparar precios de componentes de
computador en tiendas chilenas. El catálogo inicial incluye tres categorías:
memorias RAM, tarjetas gráficas (GPU) y procesadores (CPU).

La aplicación muestra precios observados en pesos chilenos (CLP), stock online,
historial de precios y horarios publicados de las tiendas. También permite buscar
productos por nombre, filtrar por categoría y consultar ofertas de comercios con
una ubicación cercana.

## Cómo funciona

1. El backend consulta las páginas configuradas en `backend/catalog.json` y
   `backend/stores.json`. El catálogo inicial incluye tres fuentes por producto.
2. El recolector guarda las observaciones en `backend/data/state.json`. Una
   observación registra el precio, el estado del stock y la fecha de consulta.
3. El frontend solicita esos datos a la API y los presenta en tarjetas. El mínimo
   disponible se calcula a partir de ofertas vigentes con stock online verificado.
4. Al abrir el historial, la aplicación muestra las observaciones registradas
   para ese producto. La comparación de tendencias depende de cuántas
   observaciones se hayan guardado.
5. Si el usuario autoriza la ubicación, el navegador calcula la distancia en línea
   recta a las tiendas con coordenadas conocidas. El radio se aplica al activar
   la casilla de tiendas cercanas.

## Qué muestra la aplicación

- **Comparación de precios:** ofertas por tienda y menor precio disponible en CLP.
- **Historial:** registros de precio por producto y tienda.
- **Disponibilidad:** stock online, horarios publicados y ubicación de tiendas
  cuando la fuente entrega información suficiente.
- **Inicio de sesión único (SSO):** acceso con Google y sesión propia de la
  aplicación. El catálogo puede consultarse sin iniciar sesión. La actualización
  manual de datos requiere una sesión.
- **Multilenguaje:** interfaz en inglés y español mediante un diccionario local
  en `frontend/src/translations.js`.
- **Diseño adaptable:** el encabezado, los filtros y las tarjetas se redistribuyen
  según el ancho de pantalla.

## Cómo se organiza el código

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `frontend/src/main.jsx` | Inicia React y carga los estilos y la configuración de idioma. |
| `frontend/src/App.jsx` | Carga el catálogo y las tiendas. Coordina la búsqueda, los filtros y la ubicación. |
| `frontend/src/components/` | Contiene el inicio de sesión, las tarjetas, el historial y el selector de tiendas. |
| `frontend/src/api.js` | Centraliza las solicitudes del frontend a la API. |
| `frontend/src/geo.js` | Calcula la distancia entre la ubicación del usuario y una tienda. |
| `backend/server.ts` | Atiende las rutas de la API y coordina la recolección. |
| `backend/auth.ts` | Valida el inicio de sesión con Google y administra las sesiones. |
| `backend/collector.ts` y `backend/scraper.ts` | Consultan las fuentes y extraen datos de productos y tiendas. |
| `backend/availability.ts` y `backend/storage.ts` | Calculan el estado de apertura y administran los datos guardados, respectivamente. |

## Cómo ejecutarlo en local

**Requisitos:** Node.js compatible con Vite 7, npm y Deno.

Desde la raíz del repositorio, abre una terminal para el backend:

```powershell
cd backend
npm ci
```

Crea `backend/.env` a partir de `backend/.env.example` si todavía no existe. Luego
inicia el backend:

```powershell
deno task start
```

En una segunda terminal, también desde la raíz, inicia el frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Abre [http://localhost:5173/](http://localhost:5173/). El frontend usa Vite para
reenviar las solicitudes `/api` al backend, que escucha en el puerto `8000`.

### Configuración del inicio de sesión con Google

Para habilitar el SSO, crea un cliente OAuth de tipo **Aplicación web** y registra
esta URI autorizada de redireccionamiento:

```text
http://localhost:5173/api/auth/callback
```

Completa `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `backend/.env` y reinicia
el backend. Mantén el archivo `.env` fuera del repositorio. Si ambas credenciales
quedan vacías, el catálogo se puede usar con el SSO deshabilitado.

## Verificación

Desde `backend`, ejecuta:

```powershell
deno task check
deno task test
```

Desde `frontend`, ejecuta:

```powershell
npm run build
```
## Créditos

- Proyecto académico de Diseño de Software.
- OpenAI ChatGPT se utilizó como apoyo para la revisión de código, la resolución
  de errores y la redacción de documentación.
- El logotipo del proyecto y las ilustraciones genéricas de componentes se
  generaron con asistencia de IA. El recurso gráfico de inicio de sesión
  corresponde a Google.
