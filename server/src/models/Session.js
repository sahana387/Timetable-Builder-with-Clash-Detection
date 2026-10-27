const mongoose = require('mongoose');

const VALID_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const sessionSchema = new mongoose.Schema(
  {
    timetableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
      required: [true, 'timetableId is required']
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'courseId is required']
    },
    dayOfWeek: {
      type: String,
      required: [true, 'dayOfWeek is required'],
      enum: {
        values: VALID_DAYS,
        message: '{VALUE} is not a valid day of week. Must be Monday through Saturday.'
      }
    },
    startTime: {
      type: String,
      required: [true, 'startTime is required'],
      trim: true
    },
    endTime: {
      type: String,
      required: [true, 'endTime is required'],
      trim: true
    },
    room: {
      type: String,
      required: [true, 'room is required'],
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for fast querying by timetable and day
sessionSchema.index({ timetableId: 1 });
sessionSchema.index({ dayOfWeek: 1 });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

module.exports = Session;
