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

export const DEFAULT_SLIM_DEQUE_INITIAL_CAPACITY = 128;
export const DEFAULT_SLIM_DEQUE_CAPACITY_INCREMENT_FACTOR = 1.5;

const MIN_ALLOWED_CAPACITY_INCREMENT_FACTOR = 1.1;
const MAX_ALLOWED_CAPACITY_INCREMENT_FACTOR = 2;

type TraverseCallback = (currentIndex: number) => void;

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
export class SlimDeque<T> {
    private _cyclicBuffer: Array<T | undefined>; // Data Oriented Design.
    private _frontIndex: number = 0;
    private _size: number = 0; // The current number of items stored in the deque.
    private _numberOfCapacityIncrements: number = 0;

    private readonly _capacityIncrementFactor: number;

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
    constructor(
        initialCapacity: number = DEFAULT_SLIM_DEQUE_INITIAL_CAPACITY,
        capacityIncrementFactor: number = DEFAULT_SLIM_DEQUE_CAPACITY_INCREMENT_FACTOR
    ) {
        if (!isNaturalNumber(initialCapacity)) {
            throw new Error(
                `Failed to instantiate SlimDeque: initialCapacity must be a natural number, ` +
                `but received ${initialCapacity}`
            );
        }

        this._validateCapacityIncrementFactor(capacityIncrementFactor);
        this._cyclicBuffer = new Array<T | undefined>(initialCapacity).fill(undefined);
        this._capacityIncrementFactor = capacityIncrementFactor;
    }

    /**
     * size
     * 
     * @returns The number of items currently stored in the deque.
     */	
    public get size(): number {
        return this._size;
    }

    /**
     * isEmpty
     * 
     * @returns True if and only if the deque does not contain any item.
     */	
    public get isEmpty(): boolean {
        return this._size === 0;
    }

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
    public get capacity(): number {
        return this._cyclicBuffer.length;
    }

    /**
     * numberOfCapacityIncrements
     *
     * The `numberOfCapacityIncrements` getter is useful for metrics and monitoring.
     * A high number of capacity increments suggests that the initial capacity was underestimated.
     *
     * @returns The number of internal buffer reallocations due to insufficient capacity.
     */
    public get numberOfCapacityIncrements(): number {
        return this._numberOfCapacityIncrements;
    }

    /**
     * front
     * 
     * @returns A reference to the front item in the deque, which will be removed during
     *          the next 'popFront' operation.
     */
    public get front(): T {
        if (this._size === 0) {
            throw new Error("SlimDeque 'front' getter failed: the deque is empty");
        }
        
        return this._cyclicBuffer[this._frontIndex];
    }

    /**
     * back
     * 
     * @returns A reference to the back item in the deque, which will be removed during
     *          the next 'popBack' operation.
     */
    public get back(): T {
        if (this._size === 0) {
            throw new Error("SlimDeque 'back' getter failed: the deque is empty");
        }
        
        const backIndex = this._calculateCurrentBackIndex();
        return this._cyclicBuffer[backIndex];
    }

    /**
     * pushBack
     * 
     * Appends an item to the back of the deque, increasing its size by one.
     * 
     * @param item The item to be added to the back of the deque.
     */
    public pushBack(item: T): void {
        this._increaseCapacityIfNecessary();

        const newBackIndex = this._calculateNewBackIndex();
        this._cyclicBuffer[newBackIndex] = item;
        ++this._size;
    }

    /**
     * pushFront
     * 
     * Appends an item to the front of the deque, increasing its size by one.
     * 
     * @param item The item to be added to the front of the deque.
     */
    public pushFront(item: T): void {
        this._increaseCapacityIfNecessary();

        this._frontIndex = this._calculateNewFrontIndex();
        this._cyclicBuffer[this._frontIndex] = item;
        ++this._size;
    }

    /**
     * popBack
     * 
     * Removes and returns the item from the back of the deque, decreasing its size by one.
     * 
     * @returns The item that was removed from the back of the deque.
     */
    public popBack(): T {
        if (this._size === 0) {
            throw new Error("SlimDeque 'popBack' operation failed: the deque is empty");
        }
        
        const currentBackIndex = this._calculateCurrentBackIndex();
        const oldBackItem = this._cyclicBuffer[currentBackIndex];
        this._cyclicBuffer[currentBackIndex] = undefined; // Help the garbage collector, avoid an unnecessary reference.
        
        --this._size;
        return oldBackItem;
    }

    /**
     * popFront
     * 
     * Removes and returns the item from the front of the deque, decreasing its size by one.
     * 
     * @returns The item that was removed from the front of the deque.
     */
    public popFront(): T {
        if (this._size === 0) {
            throw new Error("SlimDeque 'popFront' operation failed: the queue is empty");
        }
        
        const oldFrontItem = this._cyclicBuffer[this._frontIndex];
        this._cyclicBuffer[this._frontIndex] = undefined; // Help the garbage collector, avoid an unnecessary reference.
        
        if (++this._frontIndex === this._cyclicBuffer.length) {
            this._frontIndex = 0;
        }
        
        --this._size;
        return oldFrontItem;
    }

    /**
     * clear
     * 
     * Removes all items from the deque, leaving it empty.
     */
    public clear(): void {
        while (!this.isEmpty) {
            this.popFront();
        }

        this._frontIndex = 0;
    }

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
    public getSnapshot(): T[] {
        const snapshotFrontToBack = new Array<T>(this._size);

        let snapshotIndex = 0;
        this._traverseFromFrontToBack(
            (currentIndex: number) => {
                snapshotFrontToBack[snapshotIndex++] = this._cyclicBuffer[currentIndex];
            }
        );

        return snapshotFrontToBack;
    }

    private _increaseCapacityIfNecessary(): void {
        const currCapacity = this._cyclicBuffer.length;
        if (this._size < currCapacity) {
            return;
        }

        const newCapacity = Math.ceil(currCapacity * this._capacityIncrementFactor);
        const newCyclicBuffer = new Array<T | undefined>(newCapacity).fill(undefined);
        
        // In the new cyclic buffer we re-order items, such that head is located
        // at index 0.
        let newBufferLastOccupiedIndex = 0;
        this._traverseFromFrontToBack(
            (currentIndex: number) => {
                newCyclicBuffer[newBufferLastOccupiedIndex++] = this._cyclicBuffer[currentIndex];
                this._cyclicBuffer[currentIndex] = undefined;
            }
        );

        this._frontIndex = 0;
        this._cyclicBuffer = newCyclicBuffer;
        ++this._numberOfCapacityIncrements;
    }

    private _calculateNewBackIndex(): number {
        return this._fixIndexIfNecessary(this._frontIndex + this._size);
    }

    private _calculateCurrentBackIndex(): number {
        return this._fixIndexIfNecessary(this._frontIndex + this._size - 1);
    }

    private _calculateNewFrontIndex(): number {
        return this._fixIndexIfNecessary(this._frontIndex - 1);
    }

    private _fixIndexIfNecessary(candidateIndex: number): number {
        if (candidateIndex >= this._cyclicBuffer.length) {
            return candidateIndex - this._cyclicBuffer.length;
        }

        if (candidateIndex < 0) {
            return candidateIndex + this._cyclicBuffer.length;
        }

        return candidateIndex;
    }

    private _validateCapacityIncrementFactor(factor: number): void {
        if (factor < MIN_ALLOWED_CAPACITY_INCREMENT_FACTOR) {
            throw new Error(
                `Failed to instantiate SlimDeque: The provided capacityIncrementFactor of ` +
                `${factor} is too small. The minimum allowed value is ${MIN_ALLOWED_CAPACITY_INCREMENT_FACTOR}`
            );
        }

        if (factor > MAX_ALLOWED_CAPACITY_INCREMENT_FACTOR) {
            throw new Error(
                `Failed to instantiate SlimDeque: The provided capacityIncrementFactor of ` +
                `${factor} is too large. The maximum allowed value is ${MIN_ALLOWED_CAPACITY_INCREMENT_FACTOR}`
            );
        }
    }

    /**
     * _traverseFromFrontToBack
     * 
     * Facilitates traversing the items in the deque in order, from front to back. 
     * The method accepts a callback, which is invoked with the current item index in
     * the internal cyclic buffer.
     * 
     * @param callback The callback to execute, provided with the current item index.
     */
    private _traverseFromFrontToBack(callback: TraverseCallback): void {
        let itemsTraversed = 0;
        let currentDequeIndex = this._frontIndex;

        while (itemsTraversed < this._size) {
            callback(currentDequeIndex);
            ++itemsTraversed;

            if (++currentDequeIndex === this._cyclicBuffer.length) {
                currentDequeIndex = 0;
            }
        }
    }
}

function isNaturalNumber(num: number): boolean {
    const floored = Math.floor(num);
    return floored >= 1 && floored === num;
}
