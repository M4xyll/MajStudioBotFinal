const axios = require('axios');
const { logAction } = require('./logger');

class HealthChecker {
    constructor() {
        this.lastStatus = null;
        this.checkInterval = null;
        this.healthEndpoint = 'http://139.28.99.175:52841/health';
    }

    async checkAPIHealth() {
        try {
            const startTime = Date.now();
            const response = await axios.get(this.healthEndpoint, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Maj-Studio-Bot-Health-Check'
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.status === 200 && response.data.status === 'ok') {
                const currentStatus = 'online';
                
                // Log status change or periodic update
                if (this.lastStatus !== currentStatus) {
                    await logAction('API_HEALTH_RESTORED', {
                        status: 'online',
                        service: response.data.service,
                        responseTime: `${responseTime}ms`,
                        timestamp: response.data.timestamp,
                        endpoint: this.healthEndpoint
                    });
                    console.log('✅ API Health: Service is back online');
                } else {
                    // Log periodic health check (every hour)
                    const now = Date.now();
                    if (!this.lastLogTime || now - this.lastLogTime > 3600000) { // 1 hour
                        await logAction('API_HEALTH_CHECK', {
                            status: 'online',
                            service: response.data.service,
                            responseTime: `${responseTime}ms`,
                            uptime: 'continuous',
                            endpoint: this.healthEndpoint
                        });
                        this.lastLogTime = now;
                    }
                }
                
                this.lastStatus = currentStatus;
                return { success: true, responseTime, data: response.data };
                
            } else {
                throw new Error(`Unexpected response: ${response.status}`);
            }
            
        } catch (error) {
            const currentStatus = 'offline';
            
            if (this.lastStatus !== currentStatus) {
                await logAction('API_HEALTH_FAILURE', {
                    status: 'offline',
                    error: error.message,
                    errorCode: error.code,
                    endpoint: this.healthEndpoint,
                    lastOnline: this.lastStatus === 'online' ? new Date().toISOString() : 'unknown'
                });
                console.log('❌ API Health: Service is offline');
            }
            
            this.lastStatus = currentStatus;
            return { success: false, error: error.message, code: error.code };
        }
    }

    startPeriodicCheck(intervalMinutes = 5) {
        // Initial check
        this.checkAPIHealth();
        
        // Set up periodic checking
        this.checkInterval = setInterval(() => {
            this.checkAPIHealth();
        }, intervalMinutes * 60 * 1000);
        
        console.log(`🏥 Health checker started - checking every ${intervalMinutes} minutes`);
    }

    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('🏥 Health checker stopped');
        }
    }
}

module.exports = HealthChecker;