/**
 * Copyright 2024 Ori Cohen https://github.com/ori88c
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  DEFAULT_SLIM_DEQUE_CAPACITY_INCREMENT_FACTOR,
  DEFAULT_SLIM_DEQUE_INITIAL_CAPACITY,
  SlimDeque
} from './data-oriented-slim-deque';

function getNewCapacity(oldCapacity: number, incrementFactor: number): number {
  return Math.ceil(oldCapacity * incrementFactor);
}

function getRandomBoolean(): boolean {
  return Math.random() < 0.5;
}

/**
 * fillWithItems
 * 
 * Populates the given deque with items, where each item is a number in the range 
 * [1, numberOfItems], ordered in ascending order from front to back.
 * 
 * The ascending order facilitates validation by ensuring predictable content.
 * 
 * Although the final order is deterministic and predictable, the order of individual 
 * push operations (`pushFront` and `pushBack`) is randomized during each call to 
 * simulate realistic insertion patterns and catch statistical errors.
 * 
 * @param numberOfItems The total number of items to add to the deque.
 * @param deque The deque instance to be populated.
 */
function fillWithItems(
  numberOfItems: number,
  capacityIncrementFactor: number,
  deque: SlimDeque<number>
): void {
  const numberOfFrontPushes = Math.ceil(numberOfItems * Math.random());
  let expectedNumberOfCapacityIncrements = deque.numberOfCapacityIncrements;
  let expectedSize = 0;

  const pushAndCheckCapacity = (pushOperation: () => void): void => {
    const oldCapacity = deque.capacity;
    const shouldTriggerCapacityIncrement = deque.size === oldCapacity;
    
    pushOperation();
    ++expectedSize;

    if (shouldTriggerCapacityIncrement) {
      ++expectedNumberOfCapacityIncrements;
      const expectedNewCapacity = getNewCapacity(oldCapacity, capacityIncrementFactor);
      expect(deque.capacity).toBe(expectedNewCapacity);
    } else {
      expect(deque.capacity).toBe(oldCapacity);
    }

    expect(deque.numberOfCapacityIncrements).toBe(expectedNumberOfCapacityIncrements);
    expect(deque.isEmpty).toBe(false);
    expect(deque.size).toBe(expectedSize);
  };

  for (let currentItem = numberOfFrontPushes; currentItem > 0; --currentItem) {
    pushAndCheckCapacity(() => {
      deque.pushFront(currentItem);
      expect(deque.front).toBe(currentItem);
    });
  }

  for (let currentItem = numberOfFrontPushes + 1; currentItem <= numberOfItems; ++currentItem) {
    pushAndCheckCapacity(() => {
      deque.pushBack(currentItem);
      expect(deque.back).toBe(currentItem);
    });
  }
}

/**
 * popAllItems
 * 
 * Removes all items from the given deque instance while performing validations 
 * based on the known internal order (ascending numbers from front to back: 
 * 1, 2, ..., deque.size).
 * 
 * Although the final result is deterministic and predictable (an empty deque), 
 * the number of individual pop operations (`popFront` and `popBack`) is randomized 
 * to simulate realistic removal patterns and identify potential statistical errors.
 *
 * @param deque The deque instance from which all items will be removed.
 */
function popAllItems(deque: SlimDeque<number>): void {
  const initialSize = deque.size;
  const initialCapacity = deque.capacity; // The capacity remains unchanged by pop operations.
  const numberOfPopFrontOperations = Math.ceil(deque.size * Math.random());
  let expectedSize = deque.size;

  const popAndValidate = (popOperation: () => void): void => {
    popOperation();
    --expectedSize;

    expect(deque.capacity).toBe(initialCapacity);
    expect(deque.size).toBe(expectedSize);
    expect(deque.isEmpty).toBe(expectedSize === 0);
  };

  for (let currentFrontItem = 1; currentFrontItem <= numberOfPopFrontOperations; ++currentFrontItem) {
    popAndValidate(() => {
      expect(deque.front).toBe(currentFrontItem);
      expect(deque.popFront()).toBe(currentFrontItem);
    });
  }

  for (let currentBackItem = initialSize; currentBackItem > numberOfPopFrontOperations; --currentBackItem) {
    popAndValidate(() => {
      expect(deque.back).toBe(currentBackItem);
      expect(deque.popBack()).toBe(currentBackItem);
    });
  }
}

function pushAllPopAllTest(
  initialCapacity: number,
  capacityIncrementFactor: number,
  numberOfItems: number
): void {
  const deque = new SlimDeque<number>(initialCapacity, capacityIncrementFactor);
  const repetitionsCount = 4; // Number of push-all & pop-all repetitions.

  for (let currRepetition = 0; currRepetition < repetitionsCount; ++currRepetition) {
    expect(deque.isEmpty).toBe(true);
    expect(deque.size).toBe(0);
    expect(() => deque.front).toThrow();
    expect(() => deque.back).toThrow();

    // Push all items in ascending front-to-back order: 1, 2, ..., numberOfItems.
    fillWithItems(numberOfItems, capacityIncrementFactor, deque);

    // Pop all items.
    popAllItems(deque);
  }
}

describe('SlimDeque tests', () => {
  describe('Happy path tests', () => {
    test(
      'push all items in a randomized order, then pop all items in a randomized order, ' +
      'expecting no buffer reallocation due to sufficient initial buffer capacity', async () => {
      const itemsCount = 365;
      const initialCapacity = itemsCount; // No buffer reallocations are expected.
      const capacityIncrementFactor = 1.8;

      pushAllPopAllTest(initialCapacity, capacityIncrementFactor, itemsCount);
    });

    test(
      'push all items in a randomized order, then pop all items in a randomized order, ' +
      'expecting buffer reallocation to occur due to insufficient initial buffer capacity', async () => {
      // This test ensures validity following multiple internal buffer reallocations.
      const itemsCount = 768;
      const initialCapacity = 1; // Small initial capacity, to trigger many buffer reallocations.
      const capacityIncrementFactor = 1.1; // Relatively small factor, to trigger multiple buffer re-allocations.

      pushAllPopAllTest(initialCapacity, capacityIncrementFactor, itemsCount);
    });

    test('push items in a randomized order, clear the deque, validate successful clearing, and repeat', async () => {
      const repetitionsCount = 5;
      const numberOfItems = 270;
      const deque = new SlimDeque<number>();

      for (let currRepetition = 0; currRepetition < repetitionsCount; ++currRepetition) {
        // Push all items in ascending front-to-back order: 1, 2, ..., numberOfItems.
        fillWithItems(numberOfItems, DEFAULT_SLIM_DEQUE_CAPACITY_INCREMENT_FACTOR, deque);

        deque.clear();
        expect(deque.size).toBe(0);
        expect(deque.isEmpty).toBe(true);
      }
    });

    test(
      'push a random number of items to random ends (randomly choosing front or back for each push), ' +
      'then pop a random number of items from random ends, performs validations including snapshot ' +
      'validity, and repeat the process', async () => {
      const numberOfMainLoopRepetitions = 63; // Sufficiently big to observe statistical errors (such should not exist).
      const maxRepetitionsForOperationBatch = 86;
      let expectedSize = 0;

      // The items invariant ensures that items are ordered in an ascending numeric sequence:
      // -k, -k+1, ..., 0, 1, 2, ..., m-1, m, from front to back.
      const deque = new SlimDeque<number>(); // Default params (initial capacity, capacity increment factor).

      const pushToRandomEnd = (): void => {
        const shouldPushFront = getRandomBoolean();

        if (shouldPushFront) {
          const item = deque.isEmpty ? 0 : (deque.front - 1);
          deque.pushFront(item);
          expect(deque.front).toBe(item);
        } else {
          const item = deque.isEmpty ? 0 : (deque.back + 1);
          deque.pushBack(item);
          expect(deque.back).toBe(item);
        }

        ++expectedSize;
        expect(deque.size).toBe(expectedSize);
        expect(deque.isEmpty).toBe(false);
      };

      const popFromRandomEnd = (): void => {
        const shouldPopFront = getRandomBoolean();

        if (shouldPopFront) {
          const removedItem = deque.popFront();
          if (!deque.isEmpty) {
            expect(deque.front).toBe(removedItem + 1);
          }
        } else {
          const removedItem = deque.popBack();
          if (!deque.isEmpty) {
            expect(deque.back).toBe(removedItem - 1);
          }
        }

        --expectedSize;
        expect(deque.size).toBe(expectedSize);
        expect(deque.isEmpty).toBe(expectedSize === 0);
      };

      const validateSnapshot = (): void => {
        expect(deque.size).toBe(expectedSize);
        const snapshot = deque.getSnapshot();

        expect(snapshot.length).toBe(deque.size);
        if (deque.isEmpty) {
          return;
        }

        let expectedCurrentItem = deque.front;
        for (const currItem of snapshot) {
          expect(currItem).toBe(expectedCurrentItem);
          ++expectedCurrentItem;
        }
      };

      let remainedMainLoopIterations = numberOfMainLoopRepetitions;
      do {
        const pushCount = Math.ceil(Math.random() * maxRepetitionsForOperationBatch);
        const popCount = Math.ceil(Math.random() * maxRepetitionsForOperationBatch);

        for (let currPush = 1; currPush <= pushCount; ++currPush) {
          pushToRandomEnd();
        }

        validateSnapshot();

        for (let currPop = 1; expectedSize > 0 && currPop <= popCount; ++currPop) {
          popFromRandomEnd();
        }

        validateSnapshot();
      } while (--remainedMainLoopIterations > 0);
    });
  });

  describe('Negative path tests', () => {
    test('constructor should throw when the initial capacity is not a natural number', () => {
      const nonNaturalNumbers = [-74, -65, -5.67, -0.00001, 0, 0.1, 0.08974, 9.543, 1898.5, 4000.0000001];
      for (const invalidInitialCapacity of nonNaturalNumbers) {
        expect(() => new SlimDeque(invalidInitialCapacity)).toThrow();
      }
    });

    test('constructor should throw when the capacity increment factor is too small', () => {
      const validInitialCapacity = 256;
      const tooSmallIncrementFactor = [-74, -65, -5.67, -0.00001, 0, 0.1, 0.08974, 1, 1.0001, 1.0009, 1.09, 1.099];
      for (const factor of tooSmallIncrementFactor) {
        expect(() => new SlimDeque(validInitialCapacity, factor)).toThrow();
      }
    });

    test('constructor should throw when the capacity increment factor is too big', () => {
      const validInitialCapacity = 180;
      const tooBigIncrementFactor = [2.0001, 2.01, 2.1, 2.544, 40, 56.498];
      for (const factor of tooBigIncrementFactor) {
        expect(() => new SlimDeque(validInitialCapacity, factor)).toThrow();
      }
    });

    test('should throw an error when accessing the front and back getters on an empty instance', () => {
      const numberOfRepetitions = 26;
      const deque = new SlimDeque();

      for (let currentRepetition = 1; currentRepetition <= numberOfRepetitions; ++currentRepetition) {
        expect(() => deque.front).toThrow();
        expect(() => deque.back).toThrow();

        // Ensure that getters do not modify the internal state.
        // In this regard, they behave similarly to const methods in C++.
        expect(deque.size).toBe(0);
        expect(deque.isEmpty).toBe(true);
        expect(deque.capacity).toBe(DEFAULT_SLIM_DEQUE_INITIAL_CAPACITY);
      }
    });
  });
});
