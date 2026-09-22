import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogsRepository } from './blogs.repository';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';

describe('BlogsRepository', () => {
  let repository: BlogsRepository;
  let blogRepo: jest.Mocked<Repository<BlogPost>>;

  const mockQueryBuilder = {
    withDeleted: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogsRepository,
        {
          provide: getRepositoryToken(BlogPost),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            increment: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    repository = module.get<BlogsRepository>(BlogsRepository);
    blogRepo = module.get(getRepositoryToken(BlogPost));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('creates and saves a blog post', async () => {
      const data = { title: 'Hello' };
      blogRepo.create.mockReturnValue(data as BlogPost);
      blogRepo.save.mockResolvedValue(data as BlogPost);

      const result = await repository.create(data);

      expect(blogRepo.create).toHaveBeenCalledWith(data);
      expect(blogRepo.save).toHaveBeenCalledWith(data);
      expect(result).toBe(data);
    });
  });

  describe('slugExists', () => {
    it('returns true when a row with the slug exists', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const exists = await repository.slugExists('hello');

      expect(exists).toBe(true);
      expect(mockQueryBuilder.withDeleted).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('blog.slug = :slug', {
        slug: 'hello',
      });
    });

    it('excludes a given id when checking', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const exists = await repository.slugExists('hello', 'id-1');

      expect(exists).toBe(false);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'blog.id != :excludeId',
        { excludeId: 'id-1' },
      );
    });
  });

  describe('findAllPaginated', () => {
    it('returns paginated results and applies filters', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'b1' }], 1]);

      const result = await repository.findAllPaginated({
        page: 1,
        limit: 10,
        status: BlogStatus.PUBLISHED,
        query: 'arena',
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'blog.status = :status',
        { status: BlogStatus.PUBLISHED },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('getStats', () => {
    it('maps raw aggregate row to the stats shape', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        totalBlogs: 12,
        publishedBlogs: 8,
        draftBlogs: 3,
        scheduledBlogs: 1,
      });

      const stats = await repository.getStats();

      expect(stats).toEqual({
        totalBlogs: 12,
        publishedBlogs: 8,
        draftBlogs: 3,
        scheduledBlogs: 1,
      });
    });

    it('defaults to zeroes when there are no rows', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(undefined);

      const stats = await repository.getStats();

      expect(stats).toEqual({
        totalBlogs: 0,
        publishedBlogs: 0,
        draftBlogs: 0,
        scheduledBlogs: 0,
      });
    });
  });

  describe('incrementViews', () => {
    it('increments the view counter by one', async () => {
      blogRepo.increment.mockResolvedValue({ affected: 1 } as never);

      await repository.incrementViews('b1');

      expect(blogRepo.increment).toHaveBeenCalledWith({ id: 'b1' }, 'views', 1);
    });
  });

  describe('softDelete', () => {
    it('throws when nothing was deleted', async () => {
      blogRepo.softDelete.mockResolvedValue({ affected: 0 } as never);

      await expect(repository.softDelete('missing')).rejects.toThrow(
        'Blog post not found',
      );
    });
  });
});
