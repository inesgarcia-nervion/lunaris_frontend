import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NewsService, NewsItem } from '../../../app/domain/services/news.service';

describe('NewsService', () => {
  let service: NewsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NewsService],
    });
    service = TestBed.inject(NewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll should return empty array when nothing stored', () => {
    expect(service.getAll()).toEqual([]);
  });

  it('getAll should return news loaded from localStorage', () => {
    const items: NewsItem[] = [
      { id: 'a', title: 'T1', text: 'B1', date: '2024-01-01' },
    ];
    localStorage.setItem('lunaris_news', JSON.stringify(items));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NewsService],
    });
    const freshSvc = TestBed.inject(NewsService);
    expect(freshSvc.getAll()).toHaveLength(1);
    expect(freshSvc.getAll()[0].title).toBe('T1');
  });

  it('getAll should handle broken localStorage gracefully', () => {
    localStorage.setItem('lunaris_news', 'not-valid-json{{{');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NewsService],
    });
    const freshSvc = TestBed.inject(NewsService);
    expect(freshSvc.getAll()).toEqual([]);
  });

  it('addNews should add item at the start and persist to localStorage', () => {
    const result = service.addNews({ title: 'Title', text: 'Text' });
    expect(result.title).toBe('Title');
    expect(result.id).toBeTruthy();
    expect(result.date).toBeTruthy();
    expect(service.getAll()).toHaveLength(1);
    expect(service.getAll()[0].id).toBe(result.id);
    const stored = JSON.parse(localStorage.getItem('lunaris_news')!);
    expect(stored).toHaveLength(1);
  });

  it('addNews should prepend new news to existing ones', () => {
    service.addNews({ title: 'First', text: 'F' });
    const second = service.addNews({ title: 'Second', text: 'S' });
    expect(service.getAll()[0].id).toBe(second.id);
  });

  it('addNews should include optional fields', () => {
    const result = service.addNews({ title: 'T', text: 'B', body: 'Body text', image: 'img.jpg' });
    expect(result.body).toBe('Body text');
    expect(result.image).toBe('img.jpg');
  });

  it('removeNews should delete item by id', () => {
    const added = service.addNews({ title: 'Delete me', text: 'X' });
    service.removeNews(added.id);
    expect(service.getAll()).toHaveLength(0);
    const stored = JSON.parse(localStorage.getItem('lunaris_news')!);
    expect(stored).toHaveLength(0);
  });

  it('removeNews on non-existent id should not fail', () => {
    service.addNews({ title: 'Keep', text: 'Y' });
    service.removeNews('nonexistent-id');
    expect(service.getAll()).toHaveLength(1);
  });

  it('news$ should emit updated list on add', () => {
    const emissions: NewsItem[][] = [];
    service.news$.subscribe(items => emissions.push([...items]));
    service.addNews({ title: 'Watch', text: 'W' });
    expect(emissions.length).toBeGreaterThanOrEqual(2);
    expect(emissions[emissions.length - 1]).toHaveLength(1);
  });

  it('news$ should emit on remove', () => {
    const item = service.addNews({ title: 'R', text: 'R' });
    const emissions: NewsItem[][] = [];
    service.news$.subscribe(items => emissions.push([...items]));
    service.removeNews(item.id);
    expect(emissions[emissions.length - 1]).toHaveLength(0);
  });
});
