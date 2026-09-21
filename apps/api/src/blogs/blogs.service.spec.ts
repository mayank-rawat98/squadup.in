import { NotFoundException } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { BlogStatus } from './entities/blog-post.entity';

describe('BlogsService public reads', () => {
  const makeRepo = () => ({
    findAllPaginated: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }),
    findPublishedBySlug: jest.fn(),
    incrementViews: jest.fn().mockResolvedValue(undefined),
    findRelatedByAuthor: jest.fn().mockResolvedValue([]),
  });

  it('pins the public index to published posts, whatever the query asks for', async () => {
    const repo = makeRepo();
    const service = new BlogsService(repo as never);

    await service.listPublished({ status: BlogStatus.DRAFT, page: 2 });

    expect(repo.findAllPaginated).toHaveBeenCalledWith({
      status: BlogStatus.PUBLISHED,
      page: 2,
    });
  });

  it('returns a published post by slug and counts the view', async () => {
    const repo = makeRepo();
    repo.findPublishedBySlug.mockResolvedValue({
      id: 'b1',
      author: 'Ops',
      views: 4,
    });
    const service = new BlogsService(repo as never);

    const { blog } = await service.getPublishedBySlug('hello');

    expect(repo.incrementViews).toHaveBeenCalledWith('b1');
    expect(blog.views).toBe(5);
    expect(repo.findRelatedByAuthor).toHaveBeenCalledWith('Ops', 'b1', 3);
  });

  it('answers 404 for a slug that is not published, without counting a view', async () => {
    const repo = makeRepo();
    repo.findPublishedBySlug.mockResolvedValue(null);
    const service = new BlogsService(repo as never);

    await expect(service.getPublishedBySlug('draft-post')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.incrementViews).not.toHaveBeenCalled();
  });
});
