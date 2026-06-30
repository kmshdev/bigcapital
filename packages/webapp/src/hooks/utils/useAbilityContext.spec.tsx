// @ts-nocheck
jest.mock('@casl/react', () => ({
  useAbility: jest.fn(),
}));

import { useAbility } from '@casl/react';
import { useAbilityContext } from './useAbilityContext';

describe('useAbilityContext', () => {
  it('returns an empty ability when the provider value is not ready', () => {
    (useAbility as jest.Mock).mockReturnValue(undefined);

    const ability = useAbilityContext();

    expect(ability.can('manage', 'all')).toBe(false);
  });
});
