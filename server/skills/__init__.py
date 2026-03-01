def disable_crashy_watchdogs(browser) -> None:
    """Remove SecurityWatchdog and StorageStateWatchdog handlers from the event bus.

    These watchdogs call get_current_page() internally, which crashes the
    entire browser session when a page target detaches during navigation.
    Since none of our skills use allowed_domains/prohibited_domains or need
    storage-state persistence, they're safely removable.

    Must be called AFTER browser.start().
    """
    event_bus = getattr(browser, "event_bus", None)
    if event_bus is None:
        return

    handlers_dict = getattr(event_bus, "handlers", {})
    for _event_name, handler_list in handlers_dict.items():
        handler_list[:] = [
            h
            for h in handler_list
            if not any(
                tag in getattr(h, "__name__", "")
                for tag in ("SecurityWatchdog", "StorageStateWatchdog")
            )
        ]

    browser._security_watchdog = None
    browser._storage_state_watchdog = None
