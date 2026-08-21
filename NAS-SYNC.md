# Mirroring Krio Griot media to the Synology NAS

Goal: every scanned image uploaded to kriogriot.com is copied to the NAS at
`/volume1/KrioGriot`, so the masters live on hardware you own. The website keeps
serving its own copy, so nothing breaks when the NAS is off.

Nothing here deletes anything from the NAS. The sync only ever adds.

## Before you start

In hPanel → Environment variables, add:

```
UPLOAD_DIR=/home/u106934582/domains/kriogriot.com/media
```

Then restart the app. This moves uploads out of the folder that gets replaced on
every deploy, and gives the NAS one fixed location to mirror.

Hostinger SSH details (from hPanel → Advanced → SSH Access):

| | |
|---|---|
| IP | 77.37.59.93 |
| Port | 65002 |
| Username | u106934582 |

## Step 1 — Create a key so the NAS can log in without a password

On the Synology: **Control Panel → Task Scheduler → Create → Scheduled Task →
User-defined script**.

- Task name: `KrioGriot key setup`
- User: `root`
- Schedule: uncheck "Enabled" (this is a one-time job you will run by hand)
- Task Settings → Run command:

```sh
KEY=/root/.ssh/kriogriot_sync
mkdir -p /root/.ssh && chmod 700 /root/.ssh
[ -f "$KEY" ] || ssh-keygen -t ed25519 -N "" -f "$KEY" -C "synology-kriogriot-sync"
mkdir -p /volume1/KrioGriot
cp "$KEY.pub" /volume1/KrioGriot/_ssh_public_key.txt
```

Save, select the task, click **Run**. Then open File Station and look in
`KrioGriot` for `_ssh_public_key.txt`. Open it and copy the whole line.

## Step 2 — Give that key to Hostinger

hPanel → Advanced → **SSH Access** → **Add SSH key**. Paste the line from
`_ssh_public_key.txt`, name it `synology`, save.

(You already have one key there named `home_endeavour` — leave it alone.)

## Step 3 — Create the nightly sync

Task Scheduler → **Create → Scheduled Task → User-defined script** again.

- Task name: `KrioGriot media sync`
- User: `root`
- Schedule: daily, 2:00 AM
- Task Settings → Run command:

```sh
KEY=/root/.ssh/kriogriot_sync
SRC="u106934582@77.37.59.93:/home/u106934582/domains/kriogriot.com/media/"
DEST="/volume1/KrioGriot/site-media/"
LOG="/volume1/KrioGriot/_sync-log.txt"

mkdir -p "$DEST"
echo "=== $(date) sync start ===" >> "$LOG"
rsync -az --ignore-existing \
  -e "ssh -p 65002 -i $KEY -o StrictHostKeyChecking=accept-new" \
  "$SRC" "$DEST" >> "$LOG" 2>&1
echo "=== $(date) sync finished with code $? ===" >> "$LOG"
```

Save, then select it and click **Run** once to test. Check
`/volume1/KrioGriot/_sync-log.txt` in File Station — it records every run.

## What the settings mean

- `--ignore-existing` — a file already on the NAS is never overwritten. If
  something on the website is damaged or replaced, your master copy is safe.
- No `--delete` — deleting a file on the site never deletes it from the NAS.
- `-a` preserves timestamps and folder structure.
- Files arrive under `site-media/u<number>/`, where the number is the account id.

## Worth doing as well

A nightly copy is not a backup — it faithfully copies problems too. For
irreplaceable records, also turn on **Snapshot Replication** (Btrfs volumes) or
**Hyper Backup** on the `KrioGriot` folder so you can roll back to earlier
versions.

## If it does not work

`_sync-log.txt` holds the reason. Common ones:

- *Permission denied (publickey)* — Step 2 did not take. Re-copy the key,
  making sure you got the entire line including the `ssh-ed25519` prefix.
- *No such file or directory* — `UPLOAD_DIR` is not set yet, or no images have
  been uploaded since it was set, so the `media` folder does not exist.
- If `accept-new` is rejected on an older DSM, change it to
  `StrictHostKeyChecking=no`.
