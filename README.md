<h2 align="middle">Data Oriented Slim Deque</h2>

The `SlimDeque` class provides an efficient, in-memory **doubly-ended queue** for Node.js projects. The implementation employs Data-Oriented Design principles, utilizing an underlying cyclic buffer to optimize memory layout through sequential item allocation.

This versatile data structure is ideal for enhancing the efficiency of well-known algorithms, often reducing their complexity to O(1) per push or pop operation, compared to O(log n).

Real-world examples include:
* __Stream processing with constraints__: Maintaining the minimum or maximum item from a data stream while evicting out-of-interest items based on constraints, such as age or relevance.
* __Dijkstra's algorithm for 0-1 networks__: Using a Deque as a substitute for a Priority Queue in graphs where edge weights are restricted to 0 or 1.

## Data-Oriented Design :gear:

This implementation follows the principles of Data-Oriented Design (DOD), optimizing memory layout and access patterns using arrays, particularly to enhance CPU cache efficiency. Unlike Object-Oriented Programming (OOP), where each object may be allocated in disparate locations on the heap, DOD leverages the sequential allocation of arrays, reducing the likelihood of cache misses.

## Focused API :dart:

This package provides a deque and nothing more. The absence of linear operations like iteration and splicing reflects a deliberate design choice, as resorting to such methods often indicates that a deque may not have been the most appropriate data structure in the first place.  
The sole exception is the `getSnapshot` method, included to support metrics or statistical analysis, particularly in use cases like tracking the K most recent items.

## Table of Contents :bookmark_tabs:

* [Key Features](#key-features)
* [API](#api)
* [Getter Methods](#getter-methods)
* [Use Case Example: Website Traffic Monitoring](#use-case-example)
* [Capacity Tunning](#capacity-tuning)
* [License](#license)

## Key Features :sparkles:<a id="key-features"></a>

- __Straightforward API__: Targeting pure use-cases of deques.
- __Efficiency :gear:__: Featuring a Data-Oriented Design with capacity-tuning capability, to reduce or prevent reallocations of the internal cyclic buffer.
- __Comprehensive Documentation :books:__: The class is thoroughly documented, enabling IDEs to provide helpful tooltips that enhance the coding experience.
- __Tests :test_tube:__: **Fully covered** by comprehensive unit tests, including **randomized simulations** of real-life scenarios and validations to ensure proper internal capacity scaling.
- **TypeScript** support.
- No external runtime dependencies: Only development dependencies are used.
- ES2020 Compatibility: The `tsconfig` target is set to ES2020, ensuring compatibility with ES2020 environments.

## API :globe_with_meridians:<a id="api"></a>

The `SlimDeque` class provides the following methods:

* __pushBack__: Appends an item to the back of the deque, increasing its size by one.
* __pushFront__: Appends an item to the front of the deque, increasing its size by one.
* __popBack__: Removes and returns the item from the back of the deque, decreasing its size by one.
* __popFront__: Removes and returns the item from the front of the deque, decreasing its size by one.
* __clear__: Removes all items from the deque, leaving it empty.
* __getSnapshot__: Returns an array of references to all the currently stored items in the deque, ordered from front to back.

If needed, refer to the code documentation for a more comprehensive description.

## Getter Methods :mag:<a id="getter-methods"></a>

The `SlimDeque` class provides the following getter methods to reflect the current state:

* __size__: The number of items currently stored in the deque.
* __isEmpty__: Indicates whether the deque does not contain any item.
* __front__: A reference to the front item in the deque, which will be removed during the next `popFront` operation.
* __back__: A reference to the back item in the deque, which will be removed during the next `popBack` operation.
* __capacity__: The length of the internal buffer storing items. If the observed capacity remains significantly larger than the deque's size after the initial warm-up period, it may indicate that the initial capacity was overestimated. Conversely, if the capacity has grown excessively due to buffer reallocations, it may suggest that the initial capacity was underestimated.
* __numberOfCapacityIncrements__: The number of internal buffer reallocations due to **insufficient** capacity, that have occurred during the instance's lifespan. A high number of capacity increments suggests that the initial capacity was underestimated.

To eliminate any ambiguity, all getter methods have **O(1)** time and space complexity.

## Use Case Example: Website Traffic Monitoring :man_technologist:<a id="use-case-example"></a>

Consider a component designed to track the **maximum** number of requests per-second to a web server over the last K milliseconds, using a sliding-window approach to enable timely load balancing or scaling.

By maintaining a **monotonic descending deque** (from front to back), it becomes possible to efficiently track the maximum value within the desired time frame. While a full algorithmic proof is beyond the scope of this section, consider this key insight: if the current item is greater than the item at the `back` of the deque, the latter is redundant. The current item is a more **optimal candidate** for any window that includes both, rendering the previous `back` item unnecessary.

```ts
import { SlimDeque } from 'data-oriented-slim-deque';

interface TrafficRecord {
  requestsPerSecond: number;
  timestamp: number;
}

class WebsiteTrafficMonitor {
  // Monotonic deque of traffic records. From front to back, it is sorted
  // in ascending order by 'timestamp' and descending order by 'requestsPerSecond'.
  private readonly _descTrafficRecords = new SlimDeque<TrafficRecord>();

  constructor(private readonly _windowDurationMs: number) { }

  /**
   * This method has amortized O(1) complexity, as each record
   * is pushed and popped exactly once.
   */
  public pushTrafficRecord(requestsPerSecond: number): void {
    const now = Date.now();

    // Evict out-of-window traffic records.
    while (this._isOutdatedFront(now)) {
      this._descTrafficRecords.popFront();
    }

    // Maintain the monotonic invariant of the deque: 
    // Ensure traffic records are in descending order.
    while (this._isTrafficGreaterOrEqualToBack(requestsPerSecond)) {
      // Current back item violates the Invariant.
      this._descTrafficRecords.popBack();
    }

    this._descTrafficRecords.pushBack({
      requestsPerSecond,
      timestamp: now
    });
  }

  public get peakTrafficInWindow(): number {
    return this._descTrafficRecords.isEmpty ?
      undefined :
      this._descTrafficRecords.front.requestsPerSecond;
  }

  private _isOutdatedFront(now: number): boolean {
    if (this._descTrafficRecords.isEmpty) {
      return false;
    }

    const frontTimestamp = this._descTrafficRecords.front.timestamp;
    return (now - frontTimestamp) >= this._windowDurationMs;
  }

  private _isTrafficGreaterOrEqualToBack(requestsPerSecond: number): boolean {
    if (this._descTrafficRecords.isEmpty) {
      return false;
    }

    const backTraffic = this._descTrafficRecords.back.requestsPerSecond;
    return requestsPerSecond >= backTraffic;
  }
}
```

## Capacity Tunning :wrench:<a id="capacity-tuning"></a>

The `SlimDeque` constructor allows precise control over the initial capacity and the increment factor of the internal queue buffer.
```ts
constructor(
  initialCapacity: number = DEFAULT_SLIM_DEQUE_INITIAL_CAPACITY,
  capacityIncrementFactor: number = DEFAULT_SLIM_DEQUE_CAPACITY_INCREMENT_FACTOR
)
```

The initial capacity defines the number of pre-allocated slots in the buffer. As long as the number of deque items does not exceed this capacity, no buffer reallocation is required. Since buffer reallocation is an `O(new buffer size)` operation, it is advisable to set the initial capacity to match the expected maximum deque size, if known in advance.

If the number of items exceeds the current capacity, a new internal buffer will be allocated, and all existing items will be transferred to this new buffer. The size of the new buffer will be `oldBufferSize * capacityIncrementFactor`.  
For example, if the initial capacity is 100 and the increment factor is 2, the deque will allocate a new buffer of 200 slots before adding the 101st item.  
Note: The valid range of `capacityIncrementFactor` is **[1.1, 2]**. Any out-of-range factor will cause the constructor to throw an error.

A small initial capacity may lead to frequent dynamic memory reallocations, potentially causing latency spikes. Conversely, an overly large initial capacity may result in wasted memory. Each use case should **weigh the trade-offs** between these factors. Ideally, the maximum queue size is known in advance, making the increment factor unnecessary.

## License :scroll:<a id="license"></a>

[Apache 2.0](LICENSE)
