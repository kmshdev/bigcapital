import { ServiceError } from '../Items/ServiceError';
import { allowSheetExtensions } from './ImportMulter.utils';

describe('ImportMulter utils', () => {
  it('accepts tab-separated expense sheet uploads', () => {
    const cb = jest.fn();

    allowSheetExtensions(
      {},
      {
        mimetype: 'text/tab-separated-values',
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('rejects unsupported upload mimetypes', () => {
    const cb = jest.fn();

    allowSheetExtensions(
      {},
      {
        mimetype: 'application/pdf',
      },
      cb,
    );

    expect(cb.mock.calls[0][0]).toBeInstanceOf(ServiceError);
  });
});
