import { act, render } from '@testing-library/react-native';

const mockInject = jest.fn();
let mockOnMessage: ((event: { nativeEvent: { data: string } }) => void) | undefined;

jest.mock('react-native-webview', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    WebView: ReactModule.forwardRef((props: { onMessage: typeof mockOnMessage }, ref: unknown) => {
      mockOnMessage = props.onMessage;
      ReactModule.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
      return ReactModule.createElement(View, { testID: 'webview' });
    }),
  };
});

import { BarbersMap } from '@/src/features/customer-find/BarbersMap';
import {
  barbersMapHtml,
  boundsMovedEnough,
  parseMapMessage,
  toMarkers,
  toScriptJson,
  validBounds,
} from '@/src/features/customer-find/barbersMap';
import { ALGIERS_CENTER } from '@/src/location';

const view = { minLatitude: 36.7, minLongitude: 3.0, maxLatitude: 36.8, maxLongitude: 3.1 };

describe('validBounds', () => {
  it('accepts a real viewport and clamps longitudes beyond the globe', () => {
    expect(validBounds(view)).toEqual(view);
    expect(validBounds({ ...view, minLongitude: -250, maxLongitude: 300 })).toEqual({
      ...view,
      minLongitude: -180,
      maxLongitude: 180,
    });
  });

  it.each([
    [null],
    ['x'],
    [{ ...view, minLatitude: 'a' }],
    [{ ...view, minLatitude: 37, maxLatitude: 36 }],
    [{ ...view, minLongitude: Number.NaN }],
  ])('rejects %j', (input) => {
    expect(validBounds(input)).toBeNull();
  });
});

describe('parseMapMessage', () => {
  it('parses the three message kinds', () => {
    expect(parseMapMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseMapMessage('{"type":"select","id":"b1"}')).toEqual({ type: 'select', id: 'b1' });
    expect(parseMapMessage('{"type":"select","id":null}')).toEqual({ type: 'select', id: null });
    expect(parseMapMessage(JSON.stringify({ type: 'bounds', bounds: view }))).toEqual({ type: 'bounds', bounds: view });
  });

  it('ignores anything malformed or unknown', () => {
    expect(parseMapMessage('not json')).toBeNull();
    expect(parseMapMessage('{"type":"other"}')).toBeNull();
    expect(parseMapMessage('{"type":"bounds","bounds":{"minLatitude":1}}')).toBeNull();
    expect(parseMapMessage('{"type":"select","id":42}')).toEqual({ type: 'select', id: null });
  });
});

describe('boundsMovedEnough', () => {
  it('always offers a search before the first one', () => {
    expect(boundsMovedEnough(null, view)).toBe(true);
  });

  it('ignores a tiny pan but offers a search after a real pan or zoom', () => {
    const nudged = { ...view, minLatitude: 36.702, maxLatitude: 36.802 };
    const panned = { ...view, minLatitude: 36.75, maxLatitude: 36.85 };
    const zoomedOut = { minLatitude: 36.6, minLongitude: 2.9, maxLatitude: 36.9, maxLongitude: 3.2 };
    expect(boundsMovedEnough(view, nudged)).toBe(false);
    expect(boundsMovedEnough(view, panned)).toBe(true);
    expect(boundsMovedEnough(view, zoomedOut)).toBe(true);
  });
});

describe('toMarkers and script embedding', () => {
  it('sends only the fields a pin needs and drops unlocated barbers', () => {
    const markers = toMarkers([
      { id: 'a', name: 'أمين', city: 'x', neighborhood: 'y', average_rating: 4, rating_count: 2, starting_price_dzd: 500, latitude: 36.7, longitude: 3.0 },
      { id: 'b', name: 'بلا موقع', city: null, neighborhood: null, average_rating: 0, rating_count: 0, starting_price_dzd: 0, latitude: Number.NaN, longitude: 3 },
    ]);

    expect(markers).toEqual([{ id: 'a', name: 'أمين', latitude: 36.7, longitude: 3.0 }]);
  });

  it('cannot break out of the script it is embedded in', () => {
    const json = toScriptJson([{ name: '</script><script>alert(1)</script> ' }]);

    expect(json).not.toContain('</script>');
    expect(json).not.toContain(' ');
    expect(JSON.parse(json)[0].name).toContain('script');
  });

  it('builds a page centred on the starting point with the pin bridge', () => {
    const html = barbersMapHtml(ALGIERS_CENTER);

    expect(html).toContain(`setView([${ALGIERS_CENTER.latitude}, ${ALGIERS_CENTER.longitude}]`);
    expect(html).toContain('window.setMarkers');
    expect(html).toContain("post({ type: 'select'");
  });
});

describe('BarbersMap', () => {
  const send = (payload: unknown) =>
    act(() => mockOnMessage?.({ nativeEvent: { data: JSON.stringify(payload) } }));
  const props = {
    center: ALGIERS_CENTER,
    markers: [{ id: 'a', name: 'أمين', latitude: 36.7, longitude: 3.0 }],
    selectedId: null as string | null,
    onSelect: jest.fn(),
    onBoundsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnMessage = undefined;
  });

  it('turns page messages into selection and viewport callbacks', async () => {
    await render(<BarbersMap {...props} />);

    await send({ type: 'ready' });
    await send({ type: 'select', id: 'barber-1' });
    await send({ type: 'bounds', bounds: view });
    await send({ type: 'bounds', bounds: { minLatitude: 9 } });

    expect(props.onSelect).toHaveBeenCalledWith('barber-1');
    expect(props.onBoundsChange).toHaveBeenCalledTimes(1);
    expect(props.onBoundsChange).toHaveBeenCalledWith(view);
  });

  it('sends nothing to the page until it reports ready, then pins and selection', async () => {
    const view2 = await render(<BarbersMap {...props} />);
    expect(mockInject).not.toHaveBeenCalled();

    await send({ type: 'ready' });
    const injected = mockInject.mock.calls.map((call) => String(call[0]));
    expect(injected.some((code) => code.startsWith('window.setMarkers(') && code.includes('أمين'))).toBe(true);
    expect(injected.some((code) => code.startsWith('window.setSelected(null)'))).toBe(true);

    await view2.rerender(<BarbersMap {...props} selectedId="a" />);
    expect(mockInject.mock.calls.map((call) => String(call[0]))).toContain('window.setSelected("a"); true;');
  });

  it('re-centers when asked, including twice on the same point', async () => {
    const view2 = await render(<BarbersMap {...props} focus={null} />);
    await send({ type: 'ready' });
    mockInject.mockClear();

    await view2.rerender(<BarbersMap {...props} focus={{ latitude: 35.7, longitude: -0.6, nonce: 1 }} />);
    await view2.rerender(<BarbersMap {...props} focus={{ latitude: 35.7, longitude: -0.6, nonce: 2 }} />);

    const centered = mockInject.mock.calls.map((call) => String(call[0])).filter((code) => code.startsWith('window.centerOn'));
    expect(centered).toHaveLength(2);
    expect(centered[0]).toContain('35.7, -0.6');
  });
});
