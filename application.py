from flask import Flask, jsonify, request
from flask import send_file
from flask_cors import CORS, cross_origin
import json
import numpy as np
import os


application = Flask(__name__)
cors = CORS(application)
application.config['CORS_HEADERS'] = 'Content-Type'

# Get the directory where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'Data')


@application.route('/zone', methods=['GET'])
@cross_origin()
def zone():
    try:
        model = request.args.get('model')
        indicator = request.args.get('indicator')
        climate = request.args.get('climate')
        zoneId = request.args.get('id')
        period = request.args.get('period')

        if not all([model, indicator, climate, zoneId, period]):
            return jsonify({"error": "Missing required parameters: model, indicator, climate, id, period"}), 400

        # Map frontend indicator names to backend directory names
        indicator_mapping = {
            'SBOT': 'SBT',
            # Add other mappings if needed
        }
        indicator = indicator_mapping.get(indicator, indicator)

        filename = os.path.join(DATA_DIR, 'MODEL', model, indicator, climate, f'{zoneId}.json')
        # Normalize path to handle relative/absolute issues
        filename = os.path.normpath(filename)
        try:
            with open(filename) as f:
                data = json.load(f)
        except FileNotFoundError:
            # Log detailed error information for debugging
            absolute_path = os.path.abspath(filename)
            base_dir = os.path.abspath(BASE_DIR)
            return jsonify({
                "error": f"File not found: {filename}",
                "absolute_path": absolute_path,
                "base_dir": base_dir,
                "data_dir": os.path.abspath(DATA_DIR),
                "request_params": {
                    "model": model,
                    "indicator": indicator,
                    "climate": climate,
                    "id": zoneId,
                    "period": period
                }
            }), 404
        except json.JSONDecodeError:
            return jsonify({"error": f"Invalid JSON in file: {filename}"}), 500

        if period not in data:
            return jsonify({"error": f"Period '{period}' not found in data"}), 400

        # Handle different data structures:
        # NPP files have: {"present": [mean, min, max], ...}
        # SST files have: {"present": value, ...}
        period_data = data[period]
        if isinstance(period_data, list) and len(period_data) >= 3:
            # NPP format: array with [mean, min, max]
            ret = {
                'mean': period_data[0],
                'min': period_data[1],
                'max': period_data[2],
                'years': data['years'],
            }
        elif isinstance(period_data, (int, float)):
            # SST format: single value (mean)
            ret = {
                'mean': period_data,
                'min': None,
                'max': None,
                'years': data['years'],
            }
        else:
            return jsonify({"error": f"Unexpected data format for period '{period}'"}), 500

        # Try to load chart data, but make it optional
        chart_filename = os.path.join(DATA_DIR, 'ZONECHART', model, f'{indicator}.json')
        try:
            with open(chart_filename) as f:
                chart = json.load(f)
                if zoneId in chart:
                    ret['chart'] = chart[zoneId]
        except (FileNotFoundError, KeyError):
            # Chart data is optional, so we continue without it
            pass

        return jsonify(ret)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@application.route('/pixel', methods=['GET'])
@cross_origin()
def pixel():
    indicator = request.args.get('indicator')
    climate = request.args.get('climate')
    period = request.args.get('period')
    latitude = request.args.get('latitude')
    longitude = request.args.get('longitude')

    # Map frontend indicator names to backend directory names
    indicator_mapping = {
        'SBOT': 'SBT',
        # Add other mappings if needed
    }
    indicator = indicator_mapping.get(indicator, indicator)

    latIndex = (float(latitude) + 179.75) / 0.5
    longIndex = (float(longitude) + 89.75) / 0.5
    index = int((latIndex * 360) + longIndex)

    filename = os.path.join(DATA_DIR, 'PIXEL', indicator, climate, f'{period}.json')
    try:
        with open(filename) as f:
            pixelJson = json.load(f)
    except FileNotFoundError:
        return jsonify({"error": f"File not found: {filename}"}), 404
    except json.JSONDecodeError:
        return jsonify({"error": f"Invalid JSON in file: {filename}"}), 500

    # Preprocessing outputs an array, not a dict
    data = {}
    if index < len(pixelJson) and pixelJson[index] is not None:
        data = pixelJson[index]

    return jsonify(data)


if __name__ == '__main__':
    application.run(host='0.0.0.0', port=8000)
