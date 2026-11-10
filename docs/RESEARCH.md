# IBM z16 hardware reference for the teardown

Everything in the "Verified" tables was checked against the two IBM Redbooks, which were
downloaded and read for this project:

- **TG** = *IBM z16 (3931) Technical Guide*, SG24-8951 — <https://www.redbooks.ibm.com/redbooks/pdfs/sg248951.pdf>
- **TI** = *IBM z16 Technical Introduction*, SG24-8950 — <https://www.redbooks.ibm.com/redbooks/pdfs/sg248950.pdf>

The other links in the original research list (IBM Developer blog, ServeTheHome, the YouTube
tours, IBM's 3D demo, the Printables STL) were **not** opened for this pass. Use them as visual
reference, but treat any number that is not in the tables below as unverified.

## Verified facts used in the video

### System and frame

| Fact | Value | Source |
|---|---|---|
| Machine type / model | 3931, Model A01 | TG 2 |
| Frames | 1–4 bolted 19-inch, 42U EIA frames: Z, A, B, C. Frame A is always present | TG 2.1 |
| CPC drawers | 1–4. CPC0 at A10, CPC1 at A15, CPC2 at A20 (frame A, filled bottom up), CPC3 at B10 | TG table 2-4 |
| Support elements | Two 1U SEs, always at A41 and A42 | TG 2.1 |
| Ethernet switches | Two 1U 24-port switches at A39 and A40 (two more in frame B or C when needed) | TG 2.1 |
| PCIe+ I/O drawers | 0–12 with PDU power, 0–10 with BPA power | TG table 2-2 |
| Power | Intelligent PDUs (2, 4, 6 or 8 line cords) or Bulk Power Assembly | TG table 2-2 |
| Cooling | Radiator (air) only. No customer water connection, no internal battery | TG table 2-2 |
| Cabling | All power, I/O and management cabling enters at the rear | TG 2.1.2 |
| Heaviest single frame | 795 kg (single-frame A, maximum PDU configuration) | TG table 11-10 |
| Maximum memory | 40 TB (10 TB per CPC drawer); 20 TB with BPA power | TG 2.5 |

Feature names: Max39 (1 drawer), Max82 (2), Max125 (3), Max168 and Max200 (4). The number is
the count of client-configurable cores. The model in this repository is a single A frame with
three CPC drawers, i.e. Max125.

### CPC drawer (5U)

| Fact | Value | Source |
|---|---|---|
| Height | 5U | TG 2.2 |
| Processor modules | Always four PU dual chip modules (DCMs) = 8 Telum chips = 64 cores | TG 2.2 |
| Memory | Up to 48 DDR4 DIMMs: six memory controllers, eight DIMMs each (32, 40 or 48 fitted) | TG 2.5.1 |
| Front | Five fans above two BMC/OSC cards and two processor power control (PPC) cards | TG fig. 2-7 |
| Rear | 12 PCIe+ Gen3 fanout / ICA SR slots (LG01–LG12), six SMP9 connectors (three redundant pairs), PSUs, water quick-connect | TG fig. 2-8 |
| PSUs | Four with PDU power, three with BPA power; N+1 | TG 2.2.4 |
| Order front to rear (top view) | fans → DIMMs → DCMs under cold plates → cooling manifold → fanout cage | TG fig. 2-6 |
| Buses | M-bus between the two chips in a DCM, X-bus between chips in a drawer, A-bus between drawers over SMP9 cables | TG 2.2 |
| Clock | Two combined BMC/OSC cards per drawer, each with one PPS and one PTP/NTP Ethernet port | TG 2.2.2 |

### Dual chip module and Telum chip

| Fact | Value | Source |
|---|---|---|
| DCM size / pins | 71.5 mm × 79 mm, 4,753-pin socket | TG 2.3 |
| DCM cooling | Thermal cap over both chips, water cold plate on top | TG 2.3 |
| Chip | 7 nm, 530 mm², 22.5 billion transistors, 8 cores, 5.2 GHz | TG 2.3.1 |
| Caches | L1 128 KB I + 128 KB D per core; L2 32 MB per core; virtual L3 up to 256 MB per chip; virtual L4 up to 2 GB per drawer | TG 2.3.1 |
| AI | On-chip AI accelerator (AIU), more than 6 TFLOPS per chip | TG 2.3.1, TI |
| Floor plan | Two columns of four cores, each beside its L2; X-bus along one edge, AIU and M-bus along the opposite edge | TG fig. 2-14 |

### PCIe+ I/O drawer and radiator

| Fact | Value | Source |
|---|---|---|
| I/O drawer | 16 I/O slots in two domains, two PCIe+ switch cards, two BMCs, two PSUs at the rear, six blowers at the front | TG 2.4 |
| Card orientation | Horizontal. Slots LG01–LG10 left, LG11–LG20 right, seen from the rear | TG 2.4 |
| Crypto Express8S | One or two HSMs per feature; up to 30 two-HSM features | TG 4.7.2 |
| Radiator cooling unit | One in frame A, one in frame B. Two pumps (N+1), up to four fan assemblies, closed loop, filled on site with the Fill and Drain Tool | TG 2.9.5 |

## Corrections to the original research notes

- **"Water-cooling paths"**: the z16 A01 has no customer water-cooling option. Water is used only
  in a sealed internal loop between the DCM cold plates and the radiator unit; the system rejects
  its heat to room air (TG table 2-2, 2.9.4).
- **A02 and AGZ** are a different machine type (3932). The Technical Guide used here covers only
  the 3931 A01, so nothing in this repository describes the A02 or the rack-mount AGZ.
- **Inconsistencies inside the Redbook itself**, in case a viewer checks: section 2.2 lists five
  POL cards and three VRMs, section 2.2.4 lists seven of each; the fan sentence in 2.2 puts the
  PSUs at the front, while figure 2-8 and section 2.2.4 put them at the rear. The model follows
  the photographs (PSUs at the rear).

## What is approximated in the 3D model

IBM does not publish mechanical drawings, so these are estimates from photographs and standard
rack dimensions, not measurements:

- Frame outer size (600 × 1070 × 2015 mm) and drawer depths (CPC 800 mm, I/O 700 mm).
- The front door. It is a stylised stand-in, not the real z16 cover. If you have the rights to
  use the Printables STL, import it in Blender over `out/ibm-z16-a-frame.glb` and hide the
  `Front door` node.
- The radiator unit occupies A01–A09 in the model; the Redbook only says it is at the bottom.
- Exact slot positions of fanouts, SMP9 connectors and I/O card types, hose routing, the number
  of POL/VRM cards shown, and the DIMM bank spacing.
- The Telum floor plan texture is redrawn from TG figure 2-14 with block proportions by eye. It
  is a diagram, not a die photograph. The die is drawn 23 × 23 mm (530 mm² if square).
