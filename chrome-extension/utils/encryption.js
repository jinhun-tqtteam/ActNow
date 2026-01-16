/**
 * ActNow Encryption Utility
 * Simple encryption for sensitive data using Web Crypto API
 */

class EncryptionUtils {
    constructor() {
        this.algorithm = { name: 'AES-GCM', length: 256 };
        this.key = null;
        this.saltKey = 'actnow_encryption_salt_v1';
    }

    async generateKey() {
        if (!this.key) {
            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(this.saltKey),
                'PBKDF2',
                false,
                ['deriveKey']
            );

            this.key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode(this.saltKey),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                this.algorithm,
                false,
                ['encrypt', 'decrypt']
            );
        }
        return this.key;
    }

    async encrypt(text) {
        try {
            const key = await this.generateKey();
            const encoder = new TextEncoder();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { ...this.algorithm, iv },
                key,
                encoder.encode(text)
            );

            const buffer = new Uint8Array(encrypted);
            const combined = new Uint8Array(iv.length + buffer.length);
            combined.set(iv);
            combined.set(buffer, iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    async decrypt(encryptedBase64) {
        try {
            const key = await this.generateKey();
            const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { ...this.algorithm, iv },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }
}

window.ActNowEncryption = new EncryptionUtils();
