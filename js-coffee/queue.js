// *(will be replaced by a Redis DB queue)*

// Queue.js
// ========
// 
// *A function to represent a queue*

// *Created by Stephen Morley - http://code.stephenmorley.org/ - and released under
// the terms of the CC0 1.0 Universal legal code:*

// *http://creativecommons.org/publicdomain/zero/1.0/legalcode*

// *items are added to the end of the queue and removed from the front.*

exports.Queue = function(){
  // initialise the queue and offset
  var queue  = [];
  var offset = 0;
  this.getLength = function(){
    // return the length of the queue
    return (queue.length - offset);
  };

  /* Returns true if the queue is empty, and false otherwise.
   */
  this.isEmpty = function(){ return (queue.length == 0); };

  /* Enqueues the specified item. The parameter is:
   * item - the item to enqueue
   */
  this.enqueue = function(item){ queue.push(item); };

  /* Dequeues an item and returns it. If the queue is empty then undefined is
   * returned.
   */
  this.dequeue = function(){
    // if the queue is empty, return undefined
    if (queue.length == 0) return undefined;
    // store the item at the front of the queue
    var item = queue[offset];
    // increment the offset and remove the free space if necessary
    if (++ offset * 2 >= queue.length){
      queue  = queue.slice(offset);
      offset = 0;
    }
    // return the dequeued item
    return item;
  };

  /* Returns the item at the front of the queue (without dequeuing it). If the
   * queue is empty then undefined is returned.
   */
  this.peek = function(){
    // return the item at the front of the queue
    return (queue.length > 0 ? queue[offset] : undefined);
  };
};
