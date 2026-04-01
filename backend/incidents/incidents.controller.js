const Incident = require('./incidents.model');
const Booking  = require('../bookings/bookings.model');

exports.reportIncident = async (req, res) => {
  try {
    const { rideId, type, subject, description, severity } = req.body;
    if (!rideId || !type || !description)
      return res.status(400).json({ message: 'rideId, type and description are required' });
    const incident = new Incident({
      rideId,
      reportedBy: req.user.userId,
      type, subject: subject || '', description, severity: severity || 'Medium'
    });
    await incident.save();
    res.status(201).json({ message: 'Incident reported', incident });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addEvidence = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    incident.evidence.push(...(req.body.evidence || []));
    await incident.save();
    res.json({ message: 'Evidence added', incident });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ reportedBy: req.user.userId })
      .populate('rideId', 'date time pickup drop')
      .sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAllIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate({
        path: 'rideId',
        select: 'date time pickup drop status costPerSeat seatsAvailable providerId',
        populate: { path: 'providerId', select: 'name email phone college role' }
      })
      .populate('reportedBy', 'name email phone college role kycData')
      .sort({ createdAt: -1 });

    // Enrich incidents with "seeker" details so the admin can see both participants.
    const enriched = await Promise.all(
      incidents.map(async (inc) => {
        const incObj = inc.toObject();
        const rideId = incObj.rideId?._id;
        if (!rideId) return incObj;

        const bookings = await Booking.find({ rideId })
          .populate('seekerId', 'name email phone college role kycData')
          .select('seekerId');

        const reportedUserId = incObj.reportedBy?._id?.toString();
        const matchedBooking = reportedUserId
          ? bookings.find((b) => b.seekerId?._id?.toString() === reportedUserId)
          : null;

        const seeker = (matchedBooking?.seekerId || bookings[0]?.seekerId) || null;
        incObj.seeker = seeker;
        return incObj;
      })
    );

    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.exportIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('rideId')
      .populate('reportedBy', 'name email phone');
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    incident.status    = 'exported_to_authorities';
    incident.exportedAt= new Date();
    incident.exportRef = `CR-${incident._id.toString().slice(-8).toUpperCase()}-${Date.now()}`;
    await incident.save();
    res.json({ message: 'Incident exported', exportRef: incident.exportRef, incident });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open','under_review','resolved','exported_to_authorities'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'resolved' ? { resolvedAt: new Date() } : {}) },
      { new: true }
    );
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.json(incident);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
