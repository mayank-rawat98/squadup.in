import { Test, TestingModule } from '@nestjs/testing';
import { TourService } from './tour.service';
import { TourRepository } from './tour.repository';
import { UserTourState } from './entities/user-tour-state.entity';

const USER_ID = 'user-1';

describe('TourService', () => {
  let service: TourService;
  let repository: jest.Mocked<TourRepository>;
  let state: UserTourState;

  beforeEach(async () => {
    state = Object.assign(new UserTourState(), {
      userId: USER_ID,
      pages: {},
      hasSeenIntroModal: false,
      hasOptedOutOfTours: false,
      seenAnnouncements: [],
    });

    const mockRepository = {
      findByUserId: jest.fn(),
      findOrCreate: jest.fn().mockImplementation(() => Promise.resolve(state)),
      save: jest
        .fn()
        .mockImplementation((s: UserTourState) => Promise.resolve(s)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TourService,
        { provide: TourRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<TourService>(TourService);
    repository = module.get(TourRepository);
  });

  describe('seen announcements', () => {
    it('adds a single dismissed announcement to the seen set', async () => {
      const result = await service.updateTour(USER_ID, {
        seenAnnouncement: 'a',
      });
      expect(result.seenAnnouncements).toEqual(['a']);
    });

    it('adds a whole batch in one request — what "Skip all" sends', async () => {
      const result = await service.updateTour(USER_ID, {
        seenAnnouncements: ['a', 'b', 'c'],
      });
      expect(result.seenAnnouncements).toEqual(['a', 'b', 'c']);
    });

    it('unions rather than appends, so a repeated id cannot grow the list', async () => {
      state.seenAnnouncements = ['a', 'b'];
      const result = await service.updateTour(USER_ID, {
        seenAnnouncements: ['b', 'c'],
      });
      expect(result.seenAnnouncements).toEqual(['a', 'b', 'c']);
    });

    it('accepts the singular and plural fields together without duplicating', async () => {
      // The catch-up modal marks the announcement it opened on seen as the user
      // arrives, then sends the remainder on close — the two can overlap.
      const result = await service.updateTour(USER_ID, {
        seenAnnouncement: 'a',
        seenAnnouncements: ['a', 'b'],
      });
      expect(result.seenAnnouncements).toEqual(['a', 'b']);
    });

    it('leaves the seen set alone when neither field is sent', async () => {
      state.seenAnnouncements = ['a'];
      const result = await service.updateTour(USER_ID, {
        hasSeenIntroModal: true,
      });
      expect(result.seenAnnouncements).toEqual(['a']);
      expect(result.hasSeenIntroModal).toBe(true);
    });

    it('clears the seen set on reset, so the announcements replay', async () => {
      state.seenAnnouncements = ['a', 'b'];
      const result = await service.resetTour(USER_ID);
      expect(result.seenAnnouncements).toEqual([]);
    });
  });

  describe('replaying the guide tour', () => {
    it('clears the page tours, the intro flag and the opt-out', async () => {
      state.pages = { dashboard: { completed: true, skipped: false } };
      state.hasSeenIntroModal = true;
      state.hasOptedOutOfTours = true;

      const result = await service.updateTour(USER_ID, {
        resetPageTours: true,
      });

      expect(result.pages).toEqual({});
      expect(result.hasSeenIntroModal).toBe(false);
      expect(result.hasOptedOutOfTours).toBe(false);
    });

    it('leaves the seen announcements alone', async () => {
      // Redoing the tour is not a request to be told about old releases again —
      // that is what POST /tour/reset is for.
      state.seenAnnouncements = ['a', 'b'];

      const result = await service.updateTour(USER_ID, {
        resetPageTours: true,
      });

      expect(result.seenAnnouncements).toEqual(['a', 'b']);
    });

    it('does not touch the tour state when the flag is absent', async () => {
      state.pages = { dashboard: { completed: true, skipped: false } };
      state.hasOptedOutOfTours = true;

      const result = await service.updateTour(USER_ID, {
        seenAnnouncement: 'a',
      });

      expect(result.pages).toEqual({
        dashboard: { completed: true, skipped: false },
      });
      expect(result.hasOptedOutOfTours).toBe(true);
    });
  });

  it('reads without writing when the user has no row yet', async () => {
    repository.findByUserId.mockResolvedValue(null);

    const result = await service.getTour(USER_ID);

    expect(result.seenAnnouncements).toEqual([]);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.findOrCreate).not.toHaveBeenCalled();
  });
});
