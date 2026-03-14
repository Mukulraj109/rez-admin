/**
 * BonusZoneService Tests (Campaign Management tab)
 *
 * Tests the frontend API service for campaign pause/resume — the second tab of Support Tools.
 *
 * 1. getCampaigns — list with filters
 * 2. updateStatus — pause active campaign
 * 3. updateStatus — resume paused campaign
 * 4. Error handling — invalid transitions, network errors
 */

import { bonusZoneService } from '../../services/api/bonusZone';

function mockFetchSuccess(data: any) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  });
}

function mockFetchError(status: number, message: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: async () => ({ success: false, message }),
  });
}

describe('BonusZoneService — Campaign Management', () => {
  describe('getCampaigns', () => {
    it('should fetch campaigns with status filter', async () => {
      const mockData = {
        campaigns: [
          { _id: 'c1', title: 'Cashback Boost', status: 'active', campaignType: 'cashback_boost' },
          { _id: 'c2', title: 'Bank Offer', status: 'active', campaignType: 'bank_offer' },
        ],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      };

      mockFetchSuccess(mockData);

      const result = await bonusZoneService.getCampaigns({ status: 'active', page: 1, limit: 20 });

      expect(result.campaigns).toHaveLength(2);
      expect(result.campaigns[0].title).toBe('Cashback Boost');

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('admin/bonus-zone/campaigns');
      expect(fetchUrl).toContain('status=active');
    });

    it('should fetch all campaigns without filter', async () => {
      mockFetchSuccess({
        campaigns: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const result = await bonusZoneService.getCampaigns({});

      expect(result.campaigns).toHaveLength(0);
    });

    it('should handle search parameter', async () => {
      mockFetchSuccess({
        campaigns: [{ _id: 'c3', title: 'Festival Offer', status: 'active' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      await bonusZoneService.getCampaigns({ search: 'Festival' });

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('search=Festival');
    });
  });

  describe('updateStatus', () => {
    it('should pause an active campaign', async () => {
      const pausedCampaign = { _id: 'c1', title: 'Cashback Boost', status: 'paused' };
      mockFetchSuccess(pausedCampaign);

      const result = await bonusZoneService.updateStatus('c1', 'paused');

      expect(result.status).toBe('paused');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('admin/bonus-zone/campaigns/c1/status');
      expect(options.method).toBe('PATCH');

      const body = JSON.parse(options.body);
      expect(body.status).toBe('paused');
    });

    it('should resume a paused campaign', async () => {
      const resumedCampaign = { _id: 'c2', title: 'Bank Offer', status: 'active' };
      mockFetchSuccess(resumedCampaign);

      const result = await bonusZoneService.updateStatus('c2', 'active');

      expect(result.status).toBe('active');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.status).toBe('active');
    });

    it('should throw on invalid status transition', async () => {
      mockFetchError(400, 'Cannot transition from expired to active');

      await expect(
        bonusZoneService.updateStatus('c3', 'active')
      ).rejects.toThrow('Cannot transition from expired to active');
    });

    it('should throw on campaign not found', async () => {
      mockFetchError(404, 'Campaign not found');

      await expect(
        bonusZoneService.updateStatus('fake-id', 'paused')
      ).rejects.toThrow('Campaign not found');
    });
  });
});
