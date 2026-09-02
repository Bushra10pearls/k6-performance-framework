// data/users.js
// SharedArray keeps ONE copy of this data in memory no matter how many VUs run.
// With 100 VUs a plain array would be duplicated 100 times; SharedArray is
// parsed once in the init context and read-only afterwards.

import { SharedArray } from 'k6/data';

export const users = new SharedArray('users', function () {
  return [
    {
      id: 1,
      username: 'Bret',
      email: 'Sincere@april.biz',
      password: 'Pa55word!1',
      searchTerm: 'qui est esse',
    },
    {
      id: 2,
      username: 'Antonette',
      email: 'Shanna@melissa.tv',
      password: 'Pa55word!2',
      searchTerm: 'eum et est',
    },
    {
      id: 3,
      username: 'Samantha',
      email: 'Nathan@yesenia.net',
      password: 'Pa55word!3',
      searchTerm: 'nesciunt quas',
    },
    {
      id: 4,
      username: 'Karianne',
      email: 'Julianne.OConner@kory.org',
      password: 'Pa55word!4',
      searchTerm: 'dolorem eum',
    },
    {
      id: 5,
      username: 'Kamren',
      email: 'Lucio_Hettinger@annie.ca',
      password: 'Pa55word!5',
      searchTerm: 'magnam facilis',
    },
  ];
});

/**
 * Deterministic, data-driven user selection.
 * __VU is 1-based, so VU 1 -> users[0], VU 2 -> users[1] ...
 * The modulo wraps around when there are more VUs than users, which is exactly
 * what you want in a 100-VU stress run.
 */
export function getUserForVU() {
  return users[(__VU - 1) % users.length];
}

/** Random pick — useful when you want less predictable traffic. */
export function getRandomUser() {
  return users[Math.floor(Math.random() * users.length)];
}
