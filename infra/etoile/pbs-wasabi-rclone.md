# Proxmox Backup Server (PBS) → Wasabi via rclone

This document explains the setup we built so future-you (or anyone else)
can remember how the PBS datastore is synced to Wasabi using **rclone**
with systemd.

------------------------------------------------------------------------

## Components

-   **PBS Datastore (local)**:\
    `/mnt/datastore/etoile`

-   **Remote (Wasabi S3)**:\
    Bucket: `etoile`\
    Remote name in rclone: `wasabi:etoile`\
    Cached locally at: `/var/lib/proxmox-backup/cache/etoile-wasabi`

-   **Systemd Service/Timer**:

    -   `rclone-etoile.service` → runs the sync job\
    -   `rclone-etoile.timer` → triggers daily at 02:00 CEST

------------------------------------------------------------------------

## Service Behavior

-   On timer trigger (or manual start), `rclone-etoile.sh` runs:

    1.  Prints current Wasabi bucket usage.
    2.  Runs `rclone sync` from local PBS datastore to Wasabi.
    3.  Exits cleanly if no changes are needed (`status=0/SUCCESS`).

-   Logs can be checked with:

    ``` bash
    journalctl -u rclone-etoile.service -n 50 --no-pager
    ```

------------------------------------------------------------------------

## Manual Commands

Check bucket contents:

``` bash
rclone ls wasabi:etoile | head
```

Check bucket size:

``` bash
rclone size wasabi:etoile
```

Compare to local datastore:

``` bash
du -sh /mnt/datastore/etoile
```

Trigger sync manually:

``` bash
systemctl start rclone-etoile.service
```

Check timers:

``` bash
systemctl list-timers --all | grep rclone-etoile
```

------------------------------------------------------------------------

## Troubleshooting

-   If service exits instantly:
    -   Check logs (`journalctl -u rclone-etoile.service`).
    -   If `status=0/SUCCESS` → sync is clean (nothing to transfer).
-   If errors:
    -   Verify Wasabi credentials in `rclone.conf`.
    -   Ensure bucket `etoile` exists in region `eu-west-2`.

------------------------------------------------------------------------

## Key Notes

-   Sync runs **push-style**: PBS datastore → Wasabi bucket.
-   When no new snapshots exist, output shows "There was nothing to
    transfer."
-   Old errors in logs (e.g. `Unknown key 'Description'`) came from
    earlier misformatted unit files and can be ignored if current
    service works.

------------------------------------------------------------------------

✨ With this setup, your backups in `/mnt/datastore/etoile` are mirrored
daily to Wasabi S3 automatically at 02:00.
