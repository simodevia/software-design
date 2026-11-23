export const translations = {
  en: {
    translation: {
      appName: "Pricewise",
      description: "Compare computer component prices",

      language: "Language",
      spanish: "Spanish",
      english: "English",

      loading: "Loading catalog…",
      error:
        "Could not load the catalog. Retrying automatically.",

      search: "Search by name",
      category: "Category",
      all: "All",

      categories: {
        RAM: "RAM",
        GPU: "Graphics cards",
        CPU: "Processors",
      },

      noProducts: "No products match the filters.",
      lowestPrice: "Lowest verified in-stock price",
      offers: "Store offers",
      results: "Products found",

      liveNotice:
        "Observed CLP prices. Check payment conditions and shipping with the retailer. Online stock does not confirm branch pickup.",

      collecting:
        "Checking retailers. This may take a minute.",

      lastRun: "Last collection",
      waiting: "Waiting for a live collection.",
      checked: "Checked",

      budget: "Maximum price (CLP, in-stock offers)",
      budgetInvalid:
        "Enter a non-negative whole amount in CLP.",

      inStockOnly: "Verified online stock only",
      noVerifiedStock:
        "No recent in-stock price verified.",

      priceUnknown: "Price unavailable",

      onlineStock:
        "Online inventory; confirm pickup with the store.",

      stale:
        "Previous observation; recheck at the retailer.",

      sourceError:
        "Source could not be verified.",

      quantity: "Units reported: {{count}}",
      transferPrice: "Transfer/deposit price",

      publishedPrice:
        "Published price; check payment conditions",

      lastKnown:
        "Last successful observation (historical)",

      updates: {
        catalogError:
          "Could not refresh products. Previously loaded observations remain visible; check their timestamps.",

        storesError:
          "Could not refresh store information. Previously loaded details may be outdated.",

        statusError:
          "Could not refresh collection status. The displayed status may be outdated.",
      },

      stock: {
        in_stock: "In stock online",
        out_of_stock: "Out of stock online",
        preorder: "Preorder / backorder",
        unknown: "Stock unverified",
      },

      auth: {
        login: "Sign in with Google",
        logout: "Sign out",
        signedIn: "Signed in as",

        sessionLoading: "Checking your session…",
        retrySession: "Retry session check",

        explanation:
          "Sign in to request a manual refresh. Scheduled collection runs automatically.",

        unconfigured:
          "Google sign-in requires local configuration. Follow docs/SSO.md.",

        connectionError:
          "Could not check the sign-in session.",

        loginError:
          "Sign-in failed or was cancelled. Try again.",

        expired:
          "Your session expired. Sign in again.",

        refresh: "Refresh prices",
        refreshing: "Collecting prices…",

        refreshStarted:
          "Collection started. Results update automatically.",

        cooldown:
          "Wait 15 minutes between manual collections.",

        actionError:
          "Could not complete the action. Try again.",
      },

      geo: {
        locate: "Use my location",
        clear: "Clear location",

        privacy:
          "Your coordinates stay in this browser tab. Distances are straight-line estimates.",

        radius: "Nearby radius",

        nearbyFilter:
          "Online stock from retailers with a nearby location (confirm pickup)",

        loading: "Requesting location…",
        ready: "Location ready.",

        unsupported:
          "Geolocation is not supported.",

        denied:
          "Location permission denied. You can still browse all offers.",

        failed:
          "Location unavailable. Try again or browse without a location.",
      },

      stores: {
        title: "Stores and opening hours",

        scope:
          "Hours are published schedules in Chilean time. Confirm branch stock and special closures. Unknown means insufficient source data.",

        pending:
          "Store information is being collected.",

        noAddress: "Address not verified.",
        noHours: "Opening hours not verified.",

        open: "Within published opening hours",

        closed:
          "Outside published hours / published holiday closure",

        unknown: "Current opening status unknown",

        distance: "Approximate distance: {{value}} km",

        accuracy:
          "Location from the published map or geocoded street address.",

        source: "Official contact page",
        map: "Open map",

        publishedHours: "Published opening hours",
        closedDay: "Closed",
        hoursUnavailable: "Not published",

        originalHours:
          "View the original published schedule",

        locationPublishedMap:
          "Location taken from the store's published map.",

        locationGeocoded:
          "Approximate location calculated from the published street address.",

        locationUnknown:
          "Location coordinates could not be verified.",

        lastChecked:
          "Contact information checked:",

        lastAttempt:
          "Last contact information check attempted:",

        checkFailed:
          "The store's contact information could not be verified.",
      },

      history: {
        show: "View history",
        hide: "Hide history",
        title: "Price history",

        loading: "Loading history…",
        error: "Could not load the history.",
        retry: "Retry",

        empty:
          "No observations collected for this product yet.",

        date: "Date",
        store: "Store",
        price: "Price",
        stock: "Observed online stock",

        change: "Change vs previous observation",
        first: "First observation",
      },
    },
  },

  es: {
    translation: {
      appName: "Pricewise",
      description: "Compara precios de componentes",

      language: "Idioma",
      spanish: "Español",
      english: "Inglés",

      loading: "Cargando catálogo…",
      error:
        "No se pudo cargar el catálogo. Se reintentará automáticamente.",

      search: "Buscar por nombre",
      category: "Categoría",
      all: "Todas",

      categories: {
        RAM: "RAM",
        GPU: "Tarjetas gráficas",
        CPU: "Procesadores",
      },

      noProducts:
        "No hay productos que coincidan con los filtros.",

      lowestPrice: "Menor precio con stock verificado",
      offers: "Ofertas por tienda",
      results: "Productos encontrados",

      liveNotice:
        "Precios observados en CLP. Confirma condiciones de pago y despacho con la tienda. El stock web no confirma retiro en sucursal.",

      collecting:
        "Consultando tiendas. Puede demorar un minuto.",

      lastRun: "Última recolección",
      waiting: "Esperando una recolección real.",
      checked: "Verificado",

      budget: "Precio máximo (CLP, ofertas con stock)",
      budgetInvalid:
        "Ingresa un monto entero y no negativo en CLP.",

      inStockOnly: "Solo stock online verificado",
      noVerifiedStock:
        "Sin precio reciente con stock verificado.",

      priceUnknown: "Precio no disponible",

      onlineStock:
        "Inventario online; confirma el retiro con la tienda.",

      stale:
        "Observación anterior; confirma en la tienda.",

      sourceError:
        "No se pudo verificar la fuente.",

      quantity: "Unidades informadas: {{count}}",
      transferPrice: "Precio transferencia/depósito",

      publishedPrice:
        "Precio publicado; confirma condiciones de pago",

      lastKnown:
        "Última observación válida (histórica)",

      updates: {
        catalogError:
          "No se pudieron actualizar los productos. Se conservan las observaciones anteriores; revisa sus fechas.",

        storesError:
          "No se pudo actualizar la información de tiendas. Los datos anteriores pueden estar desactualizados.",

        statusError:
          "No se pudo actualizar el estado de recolección. El estado mostrado puede estar desactualizado.",
      },

      stock: {
        in_stock: "Con stock online",
        out_of_stock: "Sin stock online",
        preorder: "Preventa / pedido pendiente",
        unknown: "Stock sin verificar",
      },

      auth: {
        login: "Iniciar sesión con Google",
        logout: "Cerrar sesión",
        signedIn: "Sesión iniciada como",

        sessionLoading: "Comprobando tu sesión…",
        retrySession: "Reintentar consulta de sesión",

        explanation:
          "Inicia sesión para solicitar actualización manual. La recolección programada se ejecuta automáticamente.",

        unconfigured:
          "El acceso con Google requiere configuración local. Sigue docs/SSO.md.",

        connectionError:
          "No se pudo consultar la sesión.",

        loginError:
          "El acceso falló o se canceló. Inténtalo nuevamente.",

        expired:
          "La sesión expiró. Inicia sesión nuevamente.",

        refresh: "Actualizar precios",
        refreshing: "Consultando precios…",

        refreshStarted:
          "Recolección iniciada. Los resultados se actualizarán automáticamente.",

        cooldown:
          "Espera 15 minutos entre actualizaciones manuales.",

        actionError:
          "No se pudo completar la acción. Inténtalo nuevamente.",
      },

      geo: {
        locate: "Usar mi ubicación",
        clear: "Borrar ubicación",

        privacy:
          "Tus coordenadas permanecen en esta pestaña. Las distancias son aproximadas y en línea recta.",

        radius: "Radio de cercanía",

        nearbyFilter:
          "Stock online de tiendas con local cercano (confirmar retiro)",

        loading: "Solicitando ubicación…",
        ready: "Ubicación disponible.",

        unsupported:
          "Geolocalización no compatible.",

        denied:
          "Permiso de ubicación denegado. Puedes seguir consultando todas las ofertas.",

        failed:
          "Ubicación no disponible. Inténtalo nuevamente o consulta sin ubicación.",
      },

      stores: {
        title: "Tiendas y horarios",

        scope:
          "Horarios publicados en hora de Chile. Confirma stock de sucursal y cierres especiales. Desconocido indica datos insuficientes.",

        pending:
          "Consultando información de tiendas.",

        noAddress: "Dirección sin verificar.",
        noHours: "Horario sin verificar.",

        open: "Dentro del horario publicado",

        closed:
          "Fuera del horario publicado / cierre por feriado publicado",

        unknown: "Estado de apertura desconocido",

        distance: "Distancia aproximada: {{value}} km",

        accuracy:
          "Ubicación del mapa publicado o dirección geocodificada.",

        source: "Contacto oficial",
        map: "Abrir mapa",

        publishedHours: "Horario de atención publicado",
        closedDay: "Cerrado",
        hoursUnavailable: "Sin información publicada",

        originalHours:
          "Ver el horario original publicado",

        locationPublishedMap:
          "Ubicación obtenida del mapa publicado por la tienda.",

        locationGeocoded:
          "Ubicación aproximada calculada desde la dirección publicada.",

        locationUnknown:
          "No se pudieron verificar las coordenadas de la tienda.",

        lastChecked:
          "Información de contacto consultada:",

        lastAttempt:
          "Último intento de consultar la información de contacto:",

        checkFailed:
          "No se pudo verificar la información de contacto de la tienda.",
      },

      history: {
        show: "Ver historial",
        hide: "Ocultar historial",
        title: "Historial de precios",

        loading: "Cargando historial…",
        error: "No se pudo cargar el historial.",
        retry: "Reintentar",

        empty:
          "Todavía no se han recolectado observaciones de este producto.",

        date: "Fecha",
        store: "Tienda",
        price: "Precio",
        stock: "Stock online observado",

        change: "Cambio frente a observación anterior",
        first: "Primera observación",
      },
    },
  },
};