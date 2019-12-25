import { SpringValue } from './SpringValue'
import { FrameValue } from './FrameValue'

const frameLength = 1000 / 60

describe('SpringValue', () => {
  it('can animate a number', async () => {
    const spring = new SpringValue(0)
    spring.start(1, {
      config: { duration: 10 * frameLength },
    })
    await advanceUntilIdle()
    const frames = getFrames(spring)
    expect(frames).toMatchSnapshot()
  })

  it('animates a number the same as a numeric string', async () => {
    const spring1 = new SpringValue(0)
    spring1.start(10)

    await advanceUntilIdle()
    const frames = getFrames(spring1).map(n => n + 'px')

    const spring2 = new SpringValue('0px')
    spring2.start('10px')

    await advanceUntilIdle()
    expect(frames).toEqual(getFrames(spring2))
  })

  it('can animate a string', async () => {
    const spring = new SpringValue()
    spring.start({
      to: '10px 20px',
      from: '0px 0px',
      config: { duration: 10 * frameLength },
    })
    await advanceUntilIdle()
    const frames = getFrames(spring)
    expect(frames).toMatchSnapshot()
  })

  it('can animate an array of numbers', async () => {
    const spring = new SpringValue()
    spring.start({
      to: [10, 20],
      from: [0, 0],
      config: { duration: 10 * frameLength },
    })
    await advanceUntilIdle()
    const frames = getFrames(spring)
    expect(frames).not.toEqual([])
  })

  describeProps()
  describeMethods()

  describeTarget('another SpringValue', from => {
    const node = new SpringValue(from)
    return {
      node,
      set: node.set.bind(node),
      start: node.start.bind(node),
      reset: node.reset.bind(node),
    }
  })

  describeTarget('an Interpolation', from => {
    const parent = new SpringValue(from - 1)
    const node = parent.to(n => n + 1)
    return {
      node,
      set: n => parent.set(n - 1),
      start: n => parent.start(n - 1),
      reset: parent.reset.bind(parent),
    }
  })
})

function describeProps() {
  describeToProp()
  describeFromProp()
  describeResetProp()
  describeReverseProp()
  describeImmediateProp()
  describeConfigProp()
}

function describeToProp() {
  describe('when "to" prop is changed', () => {
    it.todo('resolves the "start" promise with (finished: false)')
    it.todo('avoids calling the "onStart" prop')
    it.todo('avoids calling the "onRest" prop')
  })
}

function describeFromProp() {
  describe('when "from" prop is changed', () => {
    describe('before the first animation', () => {
      it('updates the current value', () => {})
    })
    describe('after the first animation', () => {
      it.todo('does nothing unless "reset" is true')
    })
  })
}

function describeResetProp() {
  describe('when "reset" prop is true', () => {
    it.todo('resolves the "start" promise with (finished: false)')
    it.todo('calls the "onRest" prop with (finished: false)')
  })
}

function describeReverseProp() {
  describe('when "reverse" prop is true', () => {
    it('swaps the "to" and "from" props', async () => {
      const spring = new SpringValue<number>()
      spring.start({ from: 0, to: 1, reverse: true })

      await advanceUntilIdle()
      expect(getFrames(spring)).toMatchSnapshot()
    })

    it('works when "to" and "from" were set by an earlier update', async () => {
      // TODO: remove the need for "<number>"
      const spring = new SpringValue<number>({ from: 0, to: 1 })
      await advanceUntilValue(spring, 0.5)

      spring.start({ reverse: true })
      expect(spring.animation).toMatchObject({
        from: 1,
        to: 0,
      })

      await advanceUntilIdle()
      expect(getFrames(spring)).toMatchSnapshot()
    })

    it('works when "from" was set by an earlier update', async () => {
      const spring = new SpringValue(0)
      expect(spring.animation.from).toBe(0)
      spring.start({ to: 1, reverse: true })

      await advanceUntilIdle()
      expect(getFrames(spring)).toMatchSnapshot()
    })

    it('works when "from" is undefined', () => {
      const spring = new SpringValue<number>()
      spring.start({ to: 1, reverse: true })

      const { from, to } = spring.animation
      expect(from).toBe(1)
      expect(to).toBeUndefined()
    })

    it('preserves the reversal for future updates', async () => {
      const spring = new SpringValue(0)
      spring.start({ to: 1, reverse: true })
      expect(spring.animation).toMatchObject({
        to: 0,
        from: 1,
      })

      await advanceUntilIdle()

      spring.start({ to: 2 })
      expect(spring.animation).toMatchObject({
        to: 2,
        from: 1,
      })
    })
  })
}

function describeImmediateProp() {
  describe('when "immediate" prop is true', () => {
    it.todo('still resolves the "start" promise')
    it.todo('never calls the "onStart" prop')
    it.todo('never calls the "onRest" prop')

    it('stops animating', async () => {
      const spring = new SpringValue(0)
      spring.start(2)
      await advanceUntilValue(spring, 1)

      // Use "immediate" to emulate the "stop" method. (see #884)
      const value = spring.get()
      spring.start(value, { immediate: true })

      // The "immediate" prop waits until the next frame before going idle.
      mockRaf.step()

      expect(spring.idle).toBeTruthy()
      expect(spring.get()).toBe(value)
    })
  })
}

function describeConfigProp() {
  describe('the "config" prop', () => {
    describe('when "damping" is 1.0', () => {
      it('should prevent bouncing', async () => {
        const spring = new SpringValue(0)
        spring.start(1, {
          config: { frequency: 1.5, damping: 1 },
        })
        await advanceUntilIdle()
        expect(countBounces(spring)).toBe(0)
      })
    })
    describe('when "damping" is less than 1.0', () => {
      it('should bounce', async () => {
        const spring = new SpringValue(0)
        spring.start(1, {
          config: { frequency: 1.5, damping: 1 },
        })
        await advanceUntilIdle()
        expect(countBounces(spring)).toBeGreaterThan(0)
      })
    })
  })
}

function describeMethods() {
  describe('"set" method', () => {
    it('stops the active animation', async () => {
      const spring = new SpringValue(0)
      const promise = spring.start(1)

      await advanceUntilValue(spring, 0.5)
      spring.set(2)

      expect(spring.idle).toBeTruthy()
      expect(await promise).toMatchObject({
        finished: false,
        value: 2,
      })
    })

    describe('when a new value is passed', () => {
      it('calls the "onChange" prop', () => {
        const onChange = jest.fn()
        const spring = new SpringValue(0, { onChange })
        spring.set(1)
        expect(onChange).toBeCalledWith(1, spring)
      })
      it.todo('wraps the "onChange" call with "batchedUpdates"')
    })

    describe('when the current value is passed', () => {
      it('skips the "onChange" call', () => {
        const onChange = jest.fn()
        const spring = new SpringValue(0, { onChange })
        spring.set(0)
        expect(onChange).not.toBeCalled()
      })
    })
  })
}

/** The minimum requirements for testing a dynamic target */
type OpaqueTarget = {
  node: FrameValue
  set: (value: number) => any
  start: (value: number) => Promise<any>
  reset: () => void
}

function describeTarget(name: string, create: (from: number) => OpaqueTarget) {
  describe('when our target is ' + name, () => {
    let spring: SpringValue
    let target: OpaqueTarget
    beforeEach(() => {
      spring = new SpringValue(0)
      target = create(1)
    })

    it('animates toward the current value', async () => {
      spring.start({ to: target.node })
      expect(spring.priority).toBeGreaterThan(target.node.priority)
      expect(spring.animation).toMatchObject({
        to: target.node,
        toValues: null,
      })

      await advanceUntilIdle()
      expect(spring.get()).toBe(target.node.get())
    })

    it.todo('preserves its "onRest" prop between animations')

    it('can change its target while animating', async () => {
      spring.start({ to: target.node })
      await advanceUntilValue(spring, target.node.get() / 2)

      spring.start(0)
      expect(spring.priority).toBe(0)
      expect(spring.animation).toMatchObject({
        to: 0,
        toValues: [0],
      })

      await advanceUntilIdle()
      expect(spring.get()).toBe(0)
    })

    describe('when target is done animating', () => {
      it('keeps animating until the target is reached', async () => {
        spring.start({ to: target.node })
        target.start(1.1)

        await advanceUntil(() => target.node.idle)
        expect(spring.idle).toBeFalsy()

        await advanceUntilIdle()
        expect(spring.idle).toBeTruthy()
        expect(spring.get()).toBe(target.node.get())
      })
    })

    describe('when target animates after we go idle', () => {
      it('starts animating', async () => {
        spring.start({ to: target.node })
        await advanceUntil(() => spring.idle)

        target.start(2)
        await advanceUntilIdle()

        expect(getFrames(spring).length).toBeGreaterThan(1)
        expect(spring.get()).toBe(target.node.get())
      })
    })

    describe('when target has its value set (not animated)', () => {
      it('animates toward the new value', async () => {
        spring.start({ to: target.node })
        await advanceUntilIdle()

        target.set(2)
        await advanceUntilIdle()

        expect(getFrames(spring).length).toBeGreaterThan(1)
        expect(spring.get()).toBe(target.node.get())
      })
    })

    describe('when target resets its animation', () => {
      it('keeps animating', async () => {
        spring.start({ to: target.node })
        target.start(2)

        await advanceUntilValue(target.node, 1.5)
        expect(target.node.idle).toBeFalsy()

        target.reset()
        expect(target.node.get()).toBe(1)

        await advanceUntilIdle()
        const frames = getFrames(spring)

        expect(frames.length).toBeGreaterThan(1)
        expect(spring.get()).toBe(target.node.get())
      })
    })

    describe('when animating a string', () => {
      it.todo('animates as expected')
    })

    describe('when animating an array', () => {
      it.todo('animates as expected')
    })
  })
}
