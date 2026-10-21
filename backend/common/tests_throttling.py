from itertools import count
from unittest.mock import patch

from django.core.cache import cache
from django.urls import reverse

from discovery.tests_swaps import SwapFixture


class ThrottleTests(SwapFixture):
    """API limits stop bursts without locking out members who keep the app open all day."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self.client.force_authenticate(self.me)

    def poll(self, times, seconds_apart):
        clock = count(start=1_800_000_000, step=seconds_apart)
        with patch("rest_framework.throttling.SimpleRateThrottle.timer", side_effect=lambda: next(clock)):
            return [self.client.get(reverse("notifications-list")).status_code for _ in range(times)]

    def test_a_tab_left_open_all_day_keeps_working(self):
        # Ten hours of the 30-second notification poll.
        self.assertEqual(set(self.poll(1200, 30)), {200})

    def test_a_burst_from_one_member_is_still_throttled(self):
        self.assertIn(429, self.poll(400, 0))

    def test_visitors_sharing_a_campus_address_can_load_public_pages(self):
        self.client.force_authenticate(None)
        clock = count(start=1_800_000_000, step=20)
        with patch("rest_framework.throttling.SimpleRateThrottle.timer", side_effect=lambda: next(clock)):
            statuses = {self.client.get(reverse("skills")).status_code for _ in range(300)}
        self.assertEqual(statuses, {200})
