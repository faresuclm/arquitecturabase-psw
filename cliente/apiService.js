/**
 * Cliente API Moderno - Desacoplado de jQuery
 * Usa Fetch API nativo para comunicación con el backend
 */
class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.timeout = 10000; // 10 segundos
    }

    /**
     * Realiza una petición HTTP genérica
     */
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(this.baseUrl + url, {
                ...options,
                signal: controller.signal,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                throw {
                    status: response.status,
                    data: data
                };
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Tiempo de espera agotado');
            }

            throw error;
        }
    }

    /**
     * GET request
     */
    async get(url, options = {}) {
        return this.request(url, {
            ...options,
            method: 'GET'
        });
    }

    /**
     * POST request
     */
    async post(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(url, options = {}) {
        return this.request(url, {
            ...options,
            method: 'DELETE'
        });
    }

    /**
     * Maneja errores HTTP de forma consistente
     */
    handleError(error, defaultMessage = 'Error en la operación') {
        let mensaje = defaultMessage;

        if (error.status === 0 || error.message === 'Tiempo de espera agotado') {
            mensaje = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        } else if (error.status === 400) {
            mensaje = error.data?.error || 'Datos inválidos. Verifica el formulario.';
        } else if (error.status === 401) {
            mensaje = error.data?.error || 'No autorizado. Inicia sesión nuevamente.';
        } else if (error.status === 403) {
            mensaje = error.data?.error || 'Acceso denegado.';
        } else if (error.status === 404) {
            mensaje = error.data?.error || 'Recurso no encontrado.';
        } else if (error.status === 409) {
            mensaje = error.data?.error || 'Conflicto con datos existentes.';
        } else if (error.status === 500) {
            mensaje = 'Error del servidor. Intenta de nuevo más tarde.';
        } else if (error.data?.error) {
            mensaje = error.data.error;
        }

        return mensaje;
    }
}

/**
 * API Service - Capa de abstracción para todas las operaciones de la API
 */
class ApiService {
    constructor() {
        this.client = new ApiClient();
    }

    // ====== USUARIOS ======
    async registrarUsuario(email, username, password) {
        try {
            const data = await this.client.post('/registrarUsuario', {
                email,
                username,
                password
            });
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: this.client.handleError(error, 'Error al registrar usuario')
            };
        }
    }

    async loginUsuario(email, password) {
        try {
            const data = await this.client.post('/loginUsuario', {
                email,
                password
            });
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: this.client.handleError(error, 'Error al iniciar sesión')
            };
        }
    }

    async cerrarSesion() {
        try {
            const data = await this.client.post('/cerrarSesion', {});
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verificarSesion() {
        try {
            const data = await this.client.get('/ok');
            return { success: true, data };
        } catch (error) {
            return { success: false, data: null };
        }
    }

    async verificarUsername(username) {
        try {
            const data = await this.client.get(`/verificarUsername/${username}`);
            return { success: true, disponible: data.disponible };
        } catch (error) {
            return { success: false, disponible: false };
        }
    }

    async solicitarRecuperacionPassword(email) {
        try {
            const data = await this.client.post('/solicitarRecuperacionPassword', { email });
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: this.client.handleError(error, 'Error al solicitar recuperación')
            };
        }
    }

    async restablecerPassword(email, token, newPassword) {
        try {
            const data = await this.client.post('/restablecerPassword', {
                email,
                token,
                newPassword
            });
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: this.client.handleError(error, 'Error al restablecer contraseña')
            };
        }
    }

    async completarRegistroGoogle(password, username) {
        try {
            const data = await this.client.post('/completarRegistroGoogle', {
                password,
                username
            });
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: this.client.handleError(error, 'Error al completar registro')
            };
        }
    }

    // ====== GRUPOS ======
    async obtenerGrupos() {
        try {
            const data = await this.client.get('/api/grupos');
            return { success: true, data };
        } catch (error) {
            return { success: false, data: [] };
        }
    }

    async obtenerGrupo(grupoId) {
        try {
            const data = await this.client.get(`/api/grupos/${grupoId}`);
            return { success: true, data };
        } catch (error) {
            return { success: false, data: null };
        }
    }

    async unirseAGrupo(grupoId) {
        try {
            const data = await this.client.post(`/api/grupos/${grupoId}/unirse`, {});
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: this.client.handleError(error, 'Error al unirse al grupo')
            };
        }
    }

    async salirDeGrupo(grupoId) {
        try {
            const data = await this.client.post(`/api/grupos/${grupoId}/salir`, {});
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: this.client.handleError(error, 'Error al salir del grupo')
            };
        }
    }

    // ====== MENSAJES ======
    async obtenerMensajes(grupoId) {
        try {
            const data = await this.client.get(`/api/grupos/${grupoId}/mensajes`);
            return { success: true, data };
        } catch (error) {
            return { success: false, data: [] };
        }
    }

    async obtenerInfoUsuarios(emails) {
        try {
            const data = await this.client.post('/api/usuarios/info', { emails });
            return { success: true, data };
        } catch (error) {
            return { success: false, data: {} };
        }
    }
}

// Exportar para uso global o como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, ApiService };
}

