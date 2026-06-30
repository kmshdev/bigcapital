// @ts-nocheck
import React from 'react';
import { Ability } from '@casl/ability';
import { useAbility } from '@casl/react';
import { AbilityContext } from '@/components';

const emptyAbility = new Ability([]);

export const useAbilityContext = () => useAbility(AbilityContext) ?? emptyAbility;

/**
 *
 */
export const useAbilitiesFilter = () => {
  const ability = useAbilityContext();

  return React.useCallback(
    (items) => {
      return items.filter(
        (item) =>
          !item.permission ||
          ability.can(item.permission.ability, item.permission.subject),
      );
    },
    [ability],
  );
};
