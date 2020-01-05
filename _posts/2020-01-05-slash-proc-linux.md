---
layout: post
title: Exploring the /proc directory
comments: true
categories:
- linux
---

> The proc filesystem is a pseudo-filesystem which provides an interface to kernel data structures. -- linux man pages

/proc directory is not a real filesystem, it is a *Virtual File System*. It contains information about processes and other system information. It is mapped to /proc and mounted at boot time.

Running a `ls` in /proc lists a bunch of numbered directories and a bunch of files. The numbered directories are process PIDs and contains information related to the process. 

We can get information about what file contains `man 5 /proc/<filename>`.

Quick description of some files
- /proc/cmdline – Kernel command line information.
- /proc/console – Information about current consoles including tty.
- /proc/devices – Device drivers currently configured for the running kernel.
- /proc/dma – Info about current DMA channels.
- /proc/fb – Framebuffer devices.
- /proc/filesystems – Current filesystems supported by the kernel.
- /proc/iomem – Current system memory map for devices.
- /proc/ioports – Registered port regions for input output communication with device.
- /proc/loadavg – System load average.
- /proc/locks – Files currently locked by kernel.
- /proc/meminfo – Info about system memory (see above example).
- /proc/misc – Miscellaneous drivers registered for miscellaneous major device.
- /proc/modules – Currently loaded kernel modules.
- /proc/mounts – List of all mounts in use by system.
- /proc/partitions – Detailed info about partitions available to the system.
- /proc/pci – Information about every PCI device.
- /proc/stat – Record or various statistics kept from last reboot.
- /proc/swap – Information about swap space.
- /proc/uptime – Uptime information (in seconds).
- /proc/version – Kernel version, gcc version, and Linux distribution installed.

### /proc/\<pid\>

```bash
$ ls -l /proc/1
dr-xr-xr-x 2 root root 0 Jan  3 11:46 attr
-rw-r--r-- 1 root root 0 Jan  5 09:29 autogroup
-r-------- 1 root root 0 Jan  5 09:29 auxv
-r--r--r-- 1 root root 0 Jan  3 11:46 cgroup
--w------- 1 root root 0 Jan  5 09:29 clear_refs
-r--r--r-- 1 root root 0 Jan  3 22:57 cmdline
-rw-r--r-- 1 root root 0 Jan  3 11:46 comm
-rw-r--r-- 1 root root 0 Jan  5 09:29 coredump_filter
-r--r--r-- 1 root root 0 Jan  5 09:29 cpuset
lrwxrwxrwx 1 root root 0 Jan  5 09:29 cwd -> /
-r-------- 1 root root 0 Jan  3 11:46 environ
lrwxrwxrwx 1 root root 0 Jan  3 22:57 exe -> /lib/systemd/systemd
dr-x------ 2 root root 0 Jan  3 11:46 fd
dr-x------ 2 root root 0 Jan  3 11:46 fdinfo
-rw-r--r-- 1 root root 0 Jan  3 11:46 gid_map
-r-------- 1 root root 0 Jan  5 09:29 io
-r--r--r-- 1 root root 0 Jan  3 11:50 limits
-rw-r--r-- 1 root root 0 Jan  3 11:46 loginuid
dr-x------ 2 root root 0 Jan  5 09:29 map_files
-r--r--r-- 1 root root 0 Jan  5 09:29 maps
-rw------- 1 root root 0 Jan  5 09:29 mem
-r--r--r-- 1 root root 0 Jan  3 11:46 mountinfo
-r--r--r-- 1 root root 0 Jan  5 09:29 mounts
-r-------- 1 root root 0 Jan  5 09:29 mountstats
dr-xr-xr-x 5 root root 0 Jan  3 11:46 net
dr-x--x--x 2 root root 0 Jan  5 09:29 ns
-r--r--r-- 1 root root 0 Jan  5 09:29 numa_maps
-rw-r--r-- 1 root root 0 Jan  5 09:29 oom_adj
-r--r--r-- 1 root root 0 Jan  5 09:29 oom_score
-rw-r--r-- 1 root root 0 Jan  3 11:46 oom_score_adj
-r-------- 1 root root 0 Jan  5 09:29 pagemap
-r-------- 1 root root 0 Jan  5 09:29 patch_state
-r-------- 1 root root 0 Jan  5 09:29 personality
-rw-r--r-- 1 root root 0 Jan  5 09:29 projid_map
lrwxrwxrwx 1 root root 0 Jan  3 11:46 root -> /
-rw-r--r-- 1 root root 0 Jan  3 11:46 sched
-r--r--r-- 1 root root 0 Jan  5 09:29 schedstat
-r--r--r-- 1 root root 0 Jan  3 11:46 sessionid
-rw-r--r-- 1 root root 0 Jan  3 11:46 setgroups
-r--r--r-- 1 root root 0 Jan  5 09:29 smaps
-r--r--r-- 1 root root 0 Jan  5 09:29 smaps_rollup
-r-------- 1 root root 0 Jan  5 09:29 stack
-r--r--r-- 1 root root 0 Jan  3 11:46 stat
-r--r--r-- 1 root root 0 Jan  3 12:07 statm
-r--r--r-- 1 root root 0 Jan  3 11:46 status
-r-------- 1 root root 0 Jan  5 09:29 syscall
dr-xr-xr-x 3 root root 0 Jan  3 11:46 task
-r--r--r-- 1 root root 0 Jan  5 09:29 timers
-rw-rw-rw- 1 root root 0 Jan  5 09:29 timerslack_ns
-rw-r--r-- 1 root root 0 Jan  3 11:46 uid_map
-r--r--r-- 1 root root 0 Jan  5 09:29 wchan
```

Print the contents of any file to see what it contains,
```bash
$ cat /proc/1/status
Name:	systemd
State:	S (sleeping)
Tgid:	1
Ngid:	0
Pid:	1
PPid:	0
TracerPid:	0
Uid:	0	0	0	0
Gid:	0	0	0	0
FDSize:	256
...
```

We can gather that the process with PID 1 has name systemd and its current state is sleeping. The user id (Uid) and group id (Gid) are 0, which means they belong to root user.

The most common files inside a pid directory are
- cmdline – complete command line for the process, unless the process is a zombie
- environ – environmental variables
- fd      – file descriptors
- limits  – displays the soft limit, hard limit, and units of measurement for each of the process's resource limits
- mounts  – related information
- cwd     – symbolic link to the current working directory of the process
- exe     – link to the executable of the process
- root    – link to the work directory of the process
- cgroup  - describes control groups to which the process/task belongs

### Reference

- [proc(5) - Linux man page](https://linux.die.net/man/5/proc)