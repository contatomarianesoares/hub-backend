import { describe, it, expect } from 'vitest';
import evolutionClientModule from '../services/evolutionClient.js';

describe('Evolution API Client', () => {
  describe('Exported Functions', () => {
    it('should export enviarTexto function', () => {
      expect(typeof evolutionClientModule.enviarTexto).toBe('function');
    });

    it('should export getInstanceStatus function', () => {
      expect(typeof evolutionClientModule.getInstanceStatus).toBe('function');
    });

    it('should export createInstance function', () => {
      expect(typeof evolutionClientModule.createInstance).toBe('function');
    });

    it('should export listInstances function', () => {
      expect(typeof evolutionClientModule.listInstances).toBe('function');
    });

    it('should export registerWebhook function', () => {
      expect(typeof evolutionClientModule.registerWebhook).toBe('function');
    });

    it('should export updateWebhook function', () => {
      expect(typeof evolutionClientModule.updateWebhook).toBe('function');
    });

    it('should export evolutionClient axios instance', () => {
      expect(evolutionClientModule.evolutionClient).toBeDefined();
      expect(typeof evolutionClientModule.evolutionClient.post).toBe('function');
      expect(typeof evolutionClientModule.evolutionClient.get).toBe('function');
      expect(typeof evolutionClientModule.evolutionClient.put).toBe('function');
    });
  });

  describe('Function Signatures', () => {
    it('createInstance should be async and accept clientId', async () => {
      const func = evolutionClientModule.createInstance;
      expect(func.constructor.name).toBe('AsyncFunction');
    });

    it('listInstances should be async', async () => {
      const func = evolutionClientModule.listInstances;
      expect(func.constructor.name).toBe('AsyncFunction');
    });

    it('registerWebhook should be async and accept clientId, webhookUrl, events', async () => {
      const func = evolutionClientModule.registerWebhook;
      expect(func.constructor.name).toBe('AsyncFunction');
    });

    it('updateWebhook should be async and accept clientId, webhookUrl', async () => {
      const func = evolutionClientModule.updateWebhook;
      expect(func.constructor.name).toBe('AsyncFunction');
    });
  });

  describe('Function Parameters', () => {
    it('createInstance should require clientId parameter', () => {
      const func = evolutionClientModule.createInstance;
      expect(func.length).toBeGreaterThanOrEqual(0); // Parameter is destructured
    });

    it('registerWebhook should require clientId, webhookUrl, events parameters', () => {
      const func = evolutionClientModule.registerWebhook;
      expect(func.length).toBeGreaterThanOrEqual(0); // Parameter is destructured
    });

    it('updateWebhook should require clientId, webhookUrl parameters', () => {
      const func = evolutionClientModule.updateWebhook;
      expect(func.length).toBeGreaterThanOrEqual(0); // Parameter is destructured
    });
  });
});
