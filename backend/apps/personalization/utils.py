def convert_to_celsius(temperature, unit):
    """
    Converts a temperature to Celsius if it's given in Fahrenheit.

    Args:
        temperature (float): The temperature value.
        unit (str): The unit of the temperature ('C' for Celsius, 'F' for Fahrenheit).

    Returns:
        float: The temperature in Celsius.
    """
    if unit is None or not isinstance(unit, str):
        # If unit is not provided or not a string, assume Celsius or handle as error
        # For now, returning as is, but logging a warning might be good in a real app
        return temperature

    unit_upper = unit.upper()
    if unit_upper == 'F':
        return (temperature - 32) * 5 / 9
    elif unit_upper == 'C':
        return temperature
    else:
        # Unknown unit, return as is or raise an error
        # print(f"Warning: Unknown temperature unit '{unit}'. Returning temperature as is.")
        return temperature
