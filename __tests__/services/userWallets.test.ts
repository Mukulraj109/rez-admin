/**
 * UserWalletsService Tests
 *
 * Tests the frontend API service layer that powers the Support Tools page.
 * Mocks fetch to verify correct API calls, request shapes, and response handling.
 *
 * 1. searchUsers — search + pagination
 * 2. freezeWallet — freeze with reason
 * 3. unfreezeWallet — unfreeze
 * 4. adjustBalance — credit/debit with validation
 * 5. reverseCashback — with and without original TX ID
 * 6. getAuditTrail — paginated audit logs
 * 7. Error handling — network errors, API errors, 401 auto-logout
 */

import { userWalletsService } from '../../services/api/userWallets';

// Helper to mock a successful fetch response
function mockFetchSuccess(data: any) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  });
}

// Helper to mock a failed fetch response
function mockFetchError(status: number, message: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: async () => ({ success: false, message }),
  });
}

// Helper to mock a network error
function mockFetchNetworkError(message: string = 'Network error') {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(message));
}

describe('UserWalletsService', () => {
  describe('searchUsers', () => {
    it('should call GET /admin/user-wallets with search and pagination params', async () => {
      const mockData = {
        users: [
          {
            user: { _id: 'u1', phoneNumber: '+971501234567', fullName: 'John Doe' },
            wallet: { _id: 'w1', balance: { total: 500, available: 500, pending: 0, cashback: 0 }, isFrozen: false },
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      mockFetchSuccess(mockData);

      const result = await userWalletsService.searchUsers('John', 1, 20);

      expect(result.users).toHaveLength(1);
      expect(result.users[0].user.fullName).toBe('John Doe');
      expect(result.pagination.total).toBe(1);

      // Verify correct URL was called
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('admin/user-wallets');
      expect(fetchCall[0]).toContain('search=John');
      expect(fetchCall[0]).toContain('page=1');
      expect(fetchCall[0]).toContain('limit=20');
      expect(fetchCall[1].method).toBe('GET');
    });

    it('should work without search term', async () => {
      mockFetchSuccess({
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const result = await userWalletsService.searchUsers(undefined, 1, 20);

      expect(result.users).toHaveLength(0);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).not.toContain('search=');
    });

    it('should throw on API failure', async () => {
      mockFetchError(500, 'Database error');

      await expect(userWalletsService.searchUsers('test')).rejects.toThrow('Database error');
    });
  });

  describe('freezeWallet', () => {
    it('should call POST /admin/user-wallets/:userId/freeze with reason', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Wallet frozen', data: { isFrozen: true } }),
      });

      await userWalletsService.freezeWallet('user123', 'Suspicious activity');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('admin/user-wallets/user123/freeze');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.reason).toBe('Suspicious activity');
    });

    it('should throw on failure', async () => {
      mockFetchError(400, 'Reason is required');

      await expect(
        userWalletsService.freezeWallet('user123', '')
      ).rejects.toThrow('Reason is required');
    });
  });

  describe('unfreezeWallet', () => {
    it('should call POST /admin/user-wallets/:userId/unfreeze', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Wallet unfrozen', data: { isFrozen: false } }),
      });

      await userWalletsService.unfreezeWallet('user456');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('admin/user-wallets/user456/unfreeze');
      expect(options.method).toBe('POST');
    });
  });

  describe('adjustBalance', () => {
    it('should call POST /admin/user-wallets/:userId/adjust for credit', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Credited 200 NC', data: { balance: { available: 1200 } } }),
      });

      await userWalletsService.adjustBalance('user789', {
        amount: 200,
        type: 'credit',
        reason: 'Customer compensation',
      });

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('admin/user-wallets/user789/adjust');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.amount).toBe(200);
      expect(body.type).toBe('credit');
      expect(body.reason).toBe('Customer compensation');
    });

    it('should call POST /admin/user-wallets/:userId/adjust for debit', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Debited 100 NC' }),
      });

      await userWalletsService.adjustBalance('user789', {
        amount: 100,
        type: 'debit',
        reason: 'Fraud clawback',
      });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.type).toBe('debit');
      expect(body.amount).toBe(100);
    });

    it('should throw when insufficient balance for debit', async () => {
      mockFetchError(400, 'Insufficient balance');

      await expect(
        userWalletsService.adjustBalance('user789', { amount: 99999, type: 'debit', reason: 'Test' })
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('reverseCashback', () => {
    it('should call POST /admin/user-wallets/:userId/reverse-cashback without TX ID', async () => {
      const responseData = { amount: 150, newBalance: { available: 850, total: 850 } };
      mockFetchSuccess(responseData);

      const result = await userWalletsService.reverseCashback('user111', {
        amount: 150,
        reason: 'Duplicate cashback awarded',
      });

      expect(result.amount).toBe(150);
      expect(result.newBalance.available).toBe(850);

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('admin/user-wallets/user111/reverse-cashback');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.amount).toBe(150);
      expect(body.reason).toBe('Duplicate cashback awarded');
      expect(body.originalTransactionId).toBeUndefined();
    });

    it('should call POST with originalTransactionId when provided', async () => {
      const responseData = {
        amount: 200,
        newBalance: { available: 800, total: 800 },
        reversalTransactionId: 'rev-tx-123',
      };
      mockFetchSuccess(responseData);

      const result = await userWalletsService.reverseCashback('user222', {
        amount: 200,
        originalTransactionId: 'original-tx-456',
        reason: 'Incorrect cashback',
      });

      expect(result.reversalTransactionId).toBe('rev-tx-123');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.originalTransactionId).toBe('original-tx-456');
    });

    it('should throw when cashback reversal fails (insufficient balance)', async () => {
      mockFetchError(400, 'Insufficient balance for reversal');

      await expect(
        userWalletsService.reverseCashback('user333', { amount: 9999, reason: 'Test' })
      ).rejects.toThrow('Insufficient balance for reversal');
    });

    it('should throw when original transaction not found', async () => {
      mockFetchError(404, 'Transaction not found');

      await expect(
        userWalletsService.reverseCashback('user444', {
          amount: 100,
          originalTransactionId: 'fake-tx-id',
          reason: 'Test',
        })
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('getAuditTrail', () => {
    it('should call GET /admin/user-wallets/:userId/audit-trail with pagination', async () => {
      const mockData = {
        auditLogs: [
          {
            _id: 'log1',
            userId: 'user555',
            walletId: 'w1',
            operation: 'credit',
            amount: 500,
            balanceBefore: { total: 1000, available: 1000, pending: 0, cashback: 0 },
            balanceAfter: { total: 1500, available: 1500, pending: 0, cashback: 0 },
            reference: { type: 'adjustment', description: 'Admin credit' },
            metadata: { source: 'admin', adminUserId: 'admin1' },
            createdAt: '2026-03-14T12:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
      };

      mockFetchSuccess(mockData);

      const result = await userWalletsService.getAuditTrail('user555', 1, 15);

      expect(result.auditLogs).toHaveLength(1);
      expect(result.auditLogs[0].operation).toBe('credit');
      expect(result.auditLogs[0].amount).toBe(500);
      expect(result.pagination.page).toBe(1);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('admin/user-wallets/user555/audit-trail');
      expect(fetchUrl).toContain('page=1');
      expect(fetchUrl).toContain('limit=15');
    });

    it('should return empty audit trail when no logs exist', async () => {
      mockFetchSuccess({
        auditLogs: [],
        pagination: { page: 1, limit: 15, total: 0, totalPages: 0 },
      });

      const result = await userWalletsService.getAuditTrail('user666');

      expect(result.auditLogs).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetchNetworkError('Failed to fetch');

      await expect(userWalletsService.searchUsers('test')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 408,
        statusText: 'Request Timeout',
        json: async () => ({ success: false, message: 'Request timeout' }),
      });

      await expect(userWalletsService.searchUsers('slow')).rejects.toThrow();
    });

    it('should handle 401 unauthorized (token expired)', async () => {
      mockFetchError(401, 'Token expired');

      // Should throw — the apiClient also triggers auto-logout on 401
      await expect(userWalletsService.searchUsers('test')).rejects.toThrow();
    });
  });
});
