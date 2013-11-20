# example recipe
# ============


if platform?("debian", "ubuntu")
    $user = "www-data"
    $group = "www-data"
    execute "clean it" do
        command "apt-get clean -y"
    end

    execute "update package index" do
        command "apt-get update"
    end
end

if platform?("centos", "rhel")
    $user = "nginx"
    $group = "nginx"    

    # execute "clean it" do
    #     command "yum clean all"
    # end

    # execute "update package index" do
    #     command "yum update -y"
    # end
end


group "deploy" do
    gid 123
end

if node[:user] == "vagrant"

    user "vagrant" do
        group "deploy"
    end
    user $user
    template "/home/vagrant/.bashrc" do
        source "bashrc.erb"
        owner "vagrant"
    end
else
    # user $user do
    #     group "deploy"
    # end
    node[:users].each do |u|
        user u[:name] do
            username u[:name]
            shell "/bin/bash"
            home "/home/#{u[:name]}"
            group "deploy"
        end

        directory "/home/#{u[:name]}" do
            owner u[:name]
            group "deploy"
            mode 0700
        end

        directory "/home/#{u[:name]}/.ssh" do
            owner u[:name]
            group "deploy"
            mode 0700
        end

        template "/home/#{u[:name]}/.bashrc" do
            source "bashrc.erb"
            owner u[:name]
            mode 0700
        end

        cookbook_file "/home/#{u[:name]}/.profile" do
            source "profile"
            owner u[:name]
            mode 0700
        end

        execute "authorized keys" do
            command "echo #{u[:key]} > /home/#{u[:name]}/.ssh/authorized_keys"
        end
    end

    cookbook_file "/etc/sudoers" do
        source "sudoers"
        mode 0440
    end
    
    package "dos2unix"
    execute "authorized keys" do
        command "dos2unix /etc/sudoers"
    end
end

directory "/usr/local/apps" do
    owner $user
    group "deploy"
    mode 0770
end

directory "/usr/local/apps/#{node[:project]}" do
    owner $user
    group "deploy"
    mode 0770
end

directory "/srv/downloads" do
    owner $user
    group "deploy"
    mode 0770
end

directory "/usr/local/apps/#{node[:project]}/#{node[:app]}" do
    owner $user
    group "deploy"
    mode 0770
end


directory "/usr/local/venv" do
    owner $user
    group "deploy"
    mode 0770
end

# ssh  ------------------------------------------------------------------------

cookbook_file "/etc/ssh/sshd_config" do
    source "sshd_config"
end


if platform?("debian", "ubuntu")
    execute "restart ssh" do
        command "service ssh restart"
    end
else platform?("centos", "rhel")
    execute "restart ssh" do
        command "service sshd restart"
    end
end

package "wget"

if platform?("centos", "rhel")
    $user = "apache"
    
    bash "install epel" do
        user "root"
        cwd "/tmp"
        not_if do ::File.exists?('/etc/yum.repos.d/epel.repo') end
        code <<-EOH    
            wget http://ftp.osuosl.org/pub/fedora-epel/6/i386/epel-release-6-8.noarch.rpm
            wget http://rpms.famillecollet.com/enterprise/remi-release-6.rpm
            wget http://yum.postgresql.org/9.3/redhat/rhel-6-x86_64/pgdg-centos93-9.3-1.noarch.rpm
            rpm -ivh epel-release-6-8.noarch.rpm remi-release-6.rpm
        EOH
    end
end

packages = value_for_platform_family(
    ["centos","redhat","fedora"] => {'default' => ["python-devel", "mailx", "postgresql-libs"]},    
    "ubuntu" => {'default' => ["python-software-properties", "htop", "csstidy", "python-dev", "mailutils", "postgresql-#{node[:postgresql][:version]}-postgis"]},
    "default" => ["vim", "ntp", "curl", "postfix",
        "mercurial", "subversion", "unzip", "python-pip", "supervisor",
        ]
)

packages.each do |dev_pkg|
  package dev_pkg
end

if platform?("ubuntu")
    include_recipe "apt"
end


include_recipe "openssl"
include_recipe "build-essential"
include_recipe "git"
include_recipe "python"
include_recipe "nginx"
include_recipe "postgresql::server"

# # marine planner specific


# execute "add mapnik ppa" do
#     command "/usr/bin/add-apt-repository -y ppa:mapnik/nightly-2.0 && /usr/bin/apt-get update"
#     not_if "test -x /etc/apt/sources.list.d/mapnik-nightly-2_0-*.list"
# end

# package "libmapnik"
# package "mapnik-utils"
# package "python-mapnik"
# package "python-gdal"
package "python-kombu"
package "python-imaging"


case node["platform_family"]
when "debian"
  package "python-psycopg2"
  package "python-numpy"
  package "redis-server"
  package "postgis"
  template "/etc/supervisor/conf.d/app.conf" do
      source "app.conf.erb"
  end

  service "supervisor" do
      action :stop
  end

  service "supervisor" do
      action :start
  end

  cookbook_file "/etc/postgresql/#{node[:postgresql][:version]}/main/pg_hba.conf" do
      source "pg_hba.conf"
      owner "postgres"
  end

when "rhel"
    package "redis"
    template "/etc/supervisord.conf" do
        source "supervisord.conf.erb"
    end


    service "supervisord" do
        action :stop
    end

    service "supervisord" do
        action :start
    end

    bash "install psycopg2" do
      user "root"
      cwd "/tmp"
      code <<-EOH    
          pip install psycopg2
      EOH
    end

    cookbook_file "/var/lib/pgsql/data/pg_hba.conf" do
        source "pg_hba.conf"
        owner "postgres"
    end

end









execute "restart postgres" do
    command "sudo /etc/init.d/postgresql restart"
end

if node[:user] == "vagrant"
    execute "create database user" do
        command "createuser -U postgres -s vagrant"
        not_if "psql -U postgres -c '\\du' |grep vagrant", :user => 'postgres'
    end
end

execute "create database" do
    command "createdb -U postgres -T template0 -O postgres #{node[:dbname]} -E UTF8 --locale=en_US.UTF-8"
    not_if "psql -U postgres --list | grep #{node[:dbname]}", :user => 'postgres'
end

case node["platform_family"]
when "debian"
    execute "load postgis" do
        command "psql  -U postgres -d #{node[:dbname]} -f /usr/share/postgresql/9.1/contrib/postgis-1.5/postgis.sql"
        not_if "psql -U postgres #{node[:dbname]} -P pager -t --command='SELECT tablename FROM pg_catalog.pg_tables'|grep spatial_ref_sys"
    end
    execute "load spatial references" do
        command "psql -U postgres  -d #{node[:dbname]} -f /usr/share/postgresql/9.1/contrib/postgis-1.5/spatial_ref_sys.sql"
        not_if "psql -U postgres #{node[:dbname]} -P pager -t --command='SELECT srid FROM  spatial_ref_sys' |grep 900913"
    end
when "rhel"
    execute "load plpgsql" do
        command "createlang -U postgres -d #{node[:dbname]} plpgsql"
        not_if "psql -U postgres #{node[:dbname]} -P pager -t --command='select * from pg_language'|grep plpgsql"
    end
    execute "load postgis" do
        command "psql  -U postgres -d #{node[:dbname]} -f /usr/share/pgsql/contrib/spatial_ref_sys.sql"
        not_if "psql -U postgres #{node[:dbname]} -P pager -t --command='SELECT tablename FROM pg_catalog.pg_tables'|grep spatial_ref_sys"
    end
    execute "load spatial references" do
        command "psql -U postgres  -d #{node[:dbname]} -f /usr/share/pgsql/contrib/postgis-64.sql"
        not_if "psql -U postgres #{node[:dbname]} -P pager -t --command='SELECT srid FROM  spatial_ref_sys' |grep 900913"
    end
    execute "start redis" do
        command "sudo /etc/init.d/redis start"
    end

end
python_virtualenv "/usr/local/venv/#{node[:project]}" do
    action :create
    group "deploy"
    options "--system-site-packages"
    if node[:user] == "vagrant"
        owner "vagrant"
    else
        owner $user
    end
end
link "/usr/venv" do
  to "/usr/local/venv"
end
