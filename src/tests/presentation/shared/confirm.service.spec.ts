import { TestBed } from '@angular/core/testing';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';

describe('ConfirmService', () => {
  let service: ConfirmService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ConfirmService] });
    service = TestBed.inject(ConfirmService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('confirm should return a Promise', () => {
    const result = service.confirm('test?');
    expect(result).toBeInstanceOf(Promise);
    // resolve it so we don't leave pending
    service.requests$.subscribe(({ resolve }) => resolve(false));
  });

  it('confirm should emit a request with the correct message', () => {
    let emitted: { message: string; resolve: (v: boolean) => void } | null = null;
    service.requests$.subscribe(req => (emitted = req));
    service.confirm('Are you sure?');
    expect(emitted).not.toBeNull();
    expect(emitted!.message).toBe('Are you sure?');
  });

  it('confirming true resolves the Promise with true', async () => {
    service.requests$.subscribe(({ resolve }) => resolve(true));
    const result = await service.confirm('Proceed?');
    expect(result).toBe(true);
  });

  it('confirming false resolves the Promise with false', async () => {
    service.requests$.subscribe(({ resolve }) => resolve(false));
    const result = await service.confirm('Cancel?');
    expect(result).toBe(false);
  });

  it('requests$ should not emit before confirm is called', () => {
    let emitted = false;
    service.requests$.subscribe(() => (emitted = true));
    expect(emitted).toBe(false);
  });

  it('multiple calls each emit independently', () => {
    const messages: string[] = [];
    service.requests$.subscribe(({ message, resolve }) => {
      messages.push(message);
      resolve(false);
    });
    service.confirm('First');
    service.confirm('Second');
    expect(messages).toEqual(['First', 'Second']);
  });
});
