# PingPongThrower — entry point (runs automatically on boot).
import asyncio
import random
import time

import config as cfg
from hw import Hardware
from logic import Thrower


def rng():
    return random.getrandbits(16) / 65535


async def control(hw, thrower):
    period_ms = 1000 // cfg.CONTROL_HZ
    last = time.ticks_ms()
    now = 0.0                                     # monotonic seconds (ticks_ms wraps)
    while True:
        t = time.ticks_ms()
        now += time.ticks_diff(t, last) / 1000
        last = t
        for name, pot in hw.pots.items():
            thrower.knobs[name].feed(pot.read())
        for name, btn in hw.buttons.items():
            ev = btn.poll()
            if ev:
                thrower.press(name, long=(ev == "long"))
        thrower.fault = hw.driver_fault()
        hw.apply(thrower.update(now))
        await asyncio.sleep_ms(period_ms)


async def phone_remote(thrower):
    try:                                          # Wi-Fi trouble must never stop the robot
        import web
        await web.serve(thrower, cfg)
    except Exception as e:
        print("Wi-Fi disabled:", e)


async def main():
    hw = Hardware(cfg)
    thrower = Thrower(cfg, rng)
    tasks = [asyncio.create_task(control(hw, thrower))]
    if cfg.WIFI_ENABLED:
        tasks.append(asyncio.create_task(phone_remote(thrower)))
    try:
        await asyncio.gather(*tasks)
    finally:
        hw.safe()


try:
    asyncio.run(main())
finally:
    asyncio.new_event_loop()
