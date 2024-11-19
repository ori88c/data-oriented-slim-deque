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
export declare const DEFAULT_SLIM_DEQUE_INITIAL_CAPACITY = 128;
export declare const DEFAULT_SLIM_DEQUE_CAPACITY_INCREMENT_FACTOR = 1.5;
/**
 * SlimDeque
 *
 * The `SlimDeque` class implements an in-memory deque (doubly ended queue) with a basic API,
 * targeting pure Deque use cases, such as tracking the K most recent items and implementing
 * sliding window algorithms.
 *
 * ### Data-Oriented Design
 * This implementation follows the principles of Data-Oriented Design (DOD), optimizing memory
 * layout and access patterns using arrays, particularly to enhance CPU cache efficiency. Unlike
 * Object-Oriented Programming (OOP), where each object may be allocated in disparate locations on
 * the heap, DOD leverages the sequential allocation of arrays, reducing the likelihood of cache misses.
 *
 * ### Focused API
 * This package provides a deque and nothing more. The absence of linear operations like iteration
 * and splicing reflects a deliberate design choice, as resorting to such methods often indicates
 * that a deque may not have been the most appropriate data structure in the first place.
 * The sole exception is the `getSnapshot` method, included to support metrics or statistical analysis,
 * particularly in use cases like tracking the K most recent items.
 *
 * ### Terminology
 * The 'pushFront' / 'pushBack' / 'popFront' / 'popBack' terminology is inspired by std::deque in C++.
 * The 'front' and 'back' getters provide access to the next item to be removed from the respective end.
 * This is useful in scenarios where items are removed based on a specific condition.
 *
 * ### Cyclic Buffer
 * The `SlimDeque` is well-suited for pure cyclic buffer use cases. When the deque reaches its size limit,
 * items can be removed from the desired end before adding new ones. A common example is tracking a rolling
 * window of metrics, such as request durations or CPU usage, for real-time monitoring.
 */
export declare class SlimDeque<T> {
    private _cyclicBuffer;
    private _frontIndex;
    private _size;
    private _numberOfCapacityIncrements;
    private readonly _capacityIncrementFactor;
    /**
     * Constructor
     *
     * The `SlimDeque` constructor allows precise control over the initial capacity
     * and the increment factor of the internal queue buffer.
     *
     * The initial capacity defines the number of pre-allocated slots in the buffer.
     * As long as the number of deque items does not exceed this capacity, no buffer
     * reallocation is required. Since buffer reallocation is an O(new buffer size)
     * operation, it is advisable to set the initial capacity to match the expected
     * maximum queue size if known in advance.
     *
     * If the number of items exceeds the current capacity, a new internal buffer
     * will be allocated, and all existing items will be transferred to this new
     * buffer. The size of the new buffer will be `oldBufferSize * capacityIncrementFactor`.
     * For example, if the initial capacity is 100 and the increment factor is 2,
     * the deque will allocate a new buffer of 200 slots before adding the 101th item.
     *
     * ### Considerations
     * A small initial capacity may lead to frequent dynamic memory reallocations,
     * potentially causing latency spikes. Conversely, an overly large initial capacity
     * may result in wasted memory. Each use case should weigh the trade-offs between
     * these factors. Ideally, the maximum queue size is known in advance, making
     * the increment factor unnecessary.
     *
     * @param initialCapacity The initial size of the deque's internal buffer.
     * @param capacityIncrementFactor The factor by which the buffer size is increased
     *                                when the current buffer is full.
     *                                Must be in the range [1.1, 2].
     */
    constructor(initialCapacity?: number, capacityIncrementFactor?: number);
    /**
     * size
     *
     * @returns The number of items currently stored in the deque.
     */
    get size(): number;
    /**
     * isEmpty
     *
     * @returns True if and only if the deque does not contain any item.
     */
    get isEmpty(): boolean;
    /**
     * capacity
     *
     * The `capacity` getter is useful for metrics and monitoring.
     * If the observed capacity remains significantly larger than the deque's size after the
     * initial warm-up period, it may indicate that the initial capacity was overestimated.
     * Conversely, if the capacity has grown excessively due to buffer reallocations, it may
     * suggest that the initial capacity was underestimated.
     *
     * @returns The length of the internal buffer storing items.
     */
    get capacity(): number;
    /**
     * numberOfCapacityIncrements
     *
     * The `numberOfCapacityIncrements` getter is useful for metrics and monitoring.
     * A high number of capacity increments suggests that the initial capacity was underestimated.
     *
     * @returns The number of internal buffer reallocations due to insufficient capacity.
     */
    get numberOfCapacityIncrements(): number;
    /**
     * front
     *
     * @returns A reference to the front item in the deque, which will be removed during
     *          the next 'popFront' operation.
     */
    get front(): T;
    /**
     * back
     *
     * @returns A reference to the back item in the deque, which will be removed during
     *          the next 'popBack' operation.
     */
    get back(): T;
    /**
     * pushBack
     *
     * Appends an item to the back of the deque, increasing its size by one.
     *
     * @param item The item to be added to the back of the deque.
     */
    pushBack(item: T): void;
    /**
     * pushFront
     *
     * Appends an item to the front of the deque, increasing its size by one.
     *
     * @param item The item to be added to the front of the deque.
     */
    pushFront(item: T): void;
    /**
     * popBack
     *
     * Removes and returns the item from the back of the deque, decreasing its size by one.
     *
     * @returns The item that was removed from the back of the deque.
     */
    popBack(): T;
    /**
     * popFront
     *
     * Removes and returns the item from the front of the deque, decreasing its size by one.
     *
     * @returns The item that was removed from the front of the deque.
     */
    popFront(): T;
    /**
     * clear
     *
     * Removes all items from the deque, leaving it empty.
     */
    clear(): void;
    /**
     * getSnapshot
     *
     * Returns an array of references to all the currently stored items in the deque,
     * ordered from front to back.
     *
     * This method can be used, for example, to periodically log the K most recent metrics,
     * such as CPU or memory usage.
     *
     * @returns An array of references to the deque's items, ordered from front to back.
     */
    getSnapshot(): T[];
    private _increaseCapacityIfNecessary;
    private _calculateNewBackIndex;
    private _calculateCurrentBackIndex;
    private _calculateNewFrontIndex;
    private _fixIndexIfNecessary;
    private _validateCapacityIncrementFactor;
    /**
     * _traverseFromFrontToBack
     *
     * Facilitates traversing the items in the deque in order, from front to back.
     * The method accepts a callback, which is invoked with the current item index in
     * the internal cyclic buffer.
     *
     * @param callback The callback to execute, provided with the current item index.
     */
    private _traverseFromFrontToBack;
}
