import markdown
from bs4 import BeautifulSoup
import json


def parse_readme_to_json(readme_path, output_json="public_apis.json"):
    api_data = {"apis": {}}
    current_category = None

    try:
        with open(readme_path, 'r', encoding='utf-8') as f:
            markdown_content = f.read()
    except FileNotFoundError:
        print(f"Error: The file {readme_path} was not found.")
        return
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    html_content = markdown.markdown(markdown_content, extensions=['tables'])
    soup = BeautifulSoup(html_content, 'html.parser')

    # Only process tables after a category header (h3)
    for element in soup.find_all(['h3', 'table']):
        if element.name == 'h3':
            current_category = element.get_text().strip()
            api_data["apis"][current_category] = []
        elif element.name == 'table' and current_category:
            # Get headers
            header_row = element.find('tr')
            if not header_row:
                continue
            headers = [th.get_text().strip().lower()
                       for th in header_row.find_all('th')]
            # Only process tables with 'api' and 'description' columns
            if 'api' not in headers or 'description' not in headers:
                continue
            for row in element.find_all('tr')[1:]:
                cells = row.find_all('td')
                if len(cells) < 2:
                    continue
                api_entry = {}
                for idx, header in enumerate(headers):
                    if idx >= len(cells):
                        continue
                    cell = cells[idx]
                    if header == 'api':
                        link = cell.find('a')['href'] if cell.find('a') else ""
                        api_entry['name'] = cell.get_text().strip()
                        api_entry['link'] = link
                    elif header == 'description':
                        api_entry['description'] = cell.get_text().strip()
                    else:
                        api_entry[header] = cell.get_text().strip()
                api_data["apis"][current_category].append(api_entry)

    try:
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(api_data, f, indent=4)
        print(f"JSON file successfully created at {output_json}")
    except Exception as e:
        print(f"Error writing JSON file: {e}")


if __name__ == "__main__":
    readme_path = "tools/README.md"
    parse_readme_to_json(readme_path)
