import { Injectable } from '@nestjs/common';
import { TourRepository } from './tour.repository';
import { UpdateTourDto } from './dto/update-tour.dto';
import { UserTourState } from './entities/user-tour-state.entity';

@Injectable()
export class TourService {
  constructor(private readonly tourRepository: TourRepository) {}

  /**
   * Get the user's tour state. Pure read — returns in-memory defaults when no
   * row exists yet, so loading the app never writes to the DB. The row is only
   * materialised on the first actual mutation (updateTour / resetTour).
   */
  async getTour(userId: string): Promise<UserTourState> {
    const existing = await this.tourRepository.findByUserId(userId);
    return existing ?? this.defaultState(userId);
  }

  /** A non-persisted default tour state for a user with no row yet. */
  private defaultState(userId: string): UserTourState {
    const state = new UserTourState();
    state.userId = userId;
    state.pages = {};
    state.hasSeenIntroModal = false;
    state.hasOptedOutOfTours = false;
    state.seenAnnouncements = [];
    return state;
  }

  /** Merge a partial update into the user's tour state. */
  async updateTour(userId: string, dto: UpdateTourDto): Promise<UserTourState> {
    const state = await this.tourRepository.findOrCreate(userId);

    // Applied before the per-page flags below, so a caller may reset and then
    // immediately set a page's state in the same request.
    if (dto.resetPageTours) {
      state.pages = {};
      state.hasSeenIntroModal = false;
      state.hasOptedOutOfTours = false;
    }

    if (
      dto.page &&
      (dto.completed !== undefined || dto.skipped !== undefined)
    ) {
      const prev = state.pages[dto.page] ?? {
        completed: false,
        skipped: false,
      };
      state.pages = {
        ...state.pages,
        [dto.page]: {
          completed: dto.completed ?? prev.completed,
          skipped: dto.skipped ?? prev.skipped,
        },
      };
    }

    if (dto.hasSeenIntroModal !== undefined) {
      state.hasSeenIntroModal = dto.hasSeenIntroModal;
    }
    if (dto.hasOptedOutOfTours !== undefined) {
      state.hasOptedOutOfTours = dto.hasOptedOutOfTours;
    }

    // Set-union rather than append: dismissing the same announcement twice
    // (two tabs, a retried request, a "Skip all" that repeats an id already
    // marked seen on the way through) must not grow the list.
    //
    // Singular and plural are the same operation on different arities, so they
    // funnel through one union instead of two near-identical branches.
    const incoming = [
      ...(dto.seenAnnouncement ? [dto.seenAnnouncement] : []),
      ...(dto.seenAnnouncements ?? []),
    ];
    if (incoming.length > 0) {
      state.seenAnnouncements = Array.from(
        new Set([...(state.seenAnnouncements ?? []), ...incoming]),
      );
    }

    return this.tourRepository.save(state);
  }

  /**
   * Reset all tour progress and flags back to defaults. Also clears the seen
   * announcements, so a reset replays the what's-new modals too.
   */
  async resetTour(userId: string): Promise<UserTourState> {
    const state = await this.tourRepository.findOrCreate(userId);
    state.pages = {};
    state.hasSeenIntroModal = false;
    state.hasOptedOutOfTours = false;
    state.seenAnnouncements = [];
    return this.tourRepository.save(state);
  }
}
