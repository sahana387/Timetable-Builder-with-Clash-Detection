const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true
    },
    academicYear: {
      type: String,
      required: [true, 'academicYear is required'],
      trim: true
    },
    semester: {
      type: Number,
      required: [true, 'semester is required'],
      min: [1, 'semester must be at least 1']
    },
    section: {
      type: String,
      required: [true, 'section is required'],
      trim: true,
      uppercase: true
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

const Timetable = mongoose.models.Timetable || mongoose.model('Timetable', timetableSchema);

module.exports = Timetable;
